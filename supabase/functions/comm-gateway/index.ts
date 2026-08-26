// =============================================================================
// comm-gateway
//
// Single outbound path for email, SMS and WhatsApp. Provider credentials stay
// in Edge Function secrets; every send is written to message_logs.
//
// Supported providers
//   Email     SMTP relay (via Resend-compatible HTTP API), Gmail, Microsoft 365, EmailJS
//   SMS       Termii, SmartSMSSolutions, Africa's Talking, Twilio
//   WhatsApp  WhatsApp Business API, Meta Cloud API
// =============================================================================

import { fail, json, preflight } from '../_shared/cors.ts'
import { adminClient, resolveCaller } from '../_shared/supabase.ts'

interface SendRequest {
  channel: 'email' | 'sms' | 'whatsapp'
  to: string
  subject?: string
  body: string
  templateId?: string
  variables?: Record<string, string>
}

const applyVariables = (template: string, variables: Record<string, string>): string =>
  Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  )

/* ------------------------------------------------------------------ email */

const sendEmail = async (to: string, subject: string, body: string): Promise<string> => {
  const provider = Deno.env.get('EMAIL_PROVIDER') ?? 'smtp'
  const from = Deno.env.get('EMAIL_FROM') ?? 'no-reply@example.org'

  if (provider === 'emailjs') {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
        template_id: Deno.env.get('EMAILJS_TEMPLATE_ID'),
        user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
        accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
        template_params: { to_email: to, subject, message: body },
      }),
    })
    if (!res.ok) throw new Error(`EmailJS rejected the message: ${await res.text()}`)
    return 'emailjs'
  }

  // SMTP relays and the Gmail / Microsoft 365 API gateways all accept this shape.
  const endpoint = Deno.env.get('EMAIL_API_URL') ?? 'https://api.resend.com/emails'
  const key = Deno.env.get('EMAIL_API_KEY')
  if (!key) throw new Error('Email is not configured. Set EMAIL_API_KEY on this project.')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  })
  if (!res.ok) throw new Error(`Email provider rejected the message: ${await res.text()}`)
  return provider
}

/* -------------------------------------------------------------------- sms */

const sendSms = async (to: string, body: string): Promise<string> => {
  const provider = Deno.env.get('SMS_PROVIDER') ?? 'termii'
  const sender = Deno.env.get('SMS_SENDER_ID') ?? 'NegoLinks'

  if (provider === 'termii') {
    const key = Deno.env.get('TERMII_API_KEY')
    if (!key) throw new Error('Termii is not configured. Set TERMII_API_KEY.')
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from: sender, sms: body, type: 'plain', channel: 'generic', api_key: key }),
    })
    if (!res.ok) throw new Error(`Termii rejected the message: ${await res.text()}`)
    return 'termii'
  }

  if (provider === 'smartsms') {
    const token = Deno.env.get('SMARTSMS_TOKEN')
    if (!token) throw new Error('SmartSMSSolutions is not configured. Set SMARTSMS_TOKEN.')
    const params = new URLSearchParams({ token, sender, to, message: body, type: '0', routing: '3' })
    const res = await fetch(`https://app.smartsmssolutions.com/io/api/client/v1/sms/?${params}`)
    if (!res.ok) throw new Error(`SmartSMSSolutions rejected the message: ${await res.text()}`)
    return 'smartsms'
  }

  if (provider === 'africastalking') {
    const key = Deno.env.get('AT_API_KEY')
    const username = Deno.env.get('AT_USERNAME') ?? 'sandbox'
    if (!key) throw new Error("Africa's Talking is not configured. Set AT_API_KEY.")
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: key,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ username, to, message: body, from: sender }),
    })
    if (!res.ok) throw new Error(`Africa's Talking rejected the message: ${await res.text()}`)
    return 'africastalking'
  }

  // Twilio
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  if (!sid || !token || !from) throw new Error('Twilio is not configured.')

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
  if (!res.ok) throw new Error(`Twilio rejected the message: ${await res.text()}`)
  return 'twilio'
}

/* --------------------------------------------------------------- whatsapp */

const sendWhatsApp = async (to: string, body: string): Promise<string> => {
  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) {
    throw new Error('WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.')
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })
  if (!res.ok) throw new Error(`WhatsApp rejected the message: ${await res.text()}`)
  return 'meta_cloud_api'
}

/* ----------------------------------------------------------------- handler */

Deno.serve(async (req: Request) => {
  const cors = preflight(req)
  if (cors) return cors

  try {
    const caller = await resolveCaller(req)
    if (!caller) return fail('Not authorized', 401)

    const request = (await req.json()) as SendRequest
    if (!request?.to || !request?.channel) return fail('A channel and recipient are required')

    const db = adminClient()

    let subject = request.subject ?? ''
    let body = request.body ?? ''

    if (request.templateId) {
      const { data: template } = await db
        .from('communication_templates')
        .select('subject, body')
        .eq('id', request.templateId)
        .eq('org_id', caller.orgId)
        .maybeSingle()
      if (template) {
        subject = applyVariables((template.subject as string) ?? subject, request.variables ?? {})
        body = applyVariables(template.body as string, request.variables ?? {})
      }
    }

    if (!body.trim()) return fail('The message body is empty')

    let provider = ''
    let status = 'sent'
    let error: string | null = null

    try {
      if (request.channel === 'email') provider = await sendEmail(request.to, subject, body)
      else if (request.channel === 'sms') provider = await sendSms(request.to, body)
      else provider = await sendWhatsApp(request.to, body)
    } catch (sendError) {
      status = 'failed'
      error = (sendError as Error).message
    }

    await db.from('message_logs').insert({
      org_id: caller.orgId,
      channel: request.channel,
      provider,
      recipient: request.to,
      subject,
      body,
      status,
      error_text: error,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      created_by: caller.userId,
    })

    if (status === 'failed') return fail(error ?? 'The message could not be sent', 502)
    return json({ status: 'sent', channel: request.channel })
  } catch (error) {
    return fail((error as Error).message ?? 'Unexpected error', 500)
  }
})
