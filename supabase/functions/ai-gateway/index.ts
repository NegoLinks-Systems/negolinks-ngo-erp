// =============================================================================
// ai-gateway
//
// The only path through which the application reaches a language model.
//
//   * The API key lives in an Edge Function secret and never reaches the browser.
//   * The provider is abstracted: switching from Groq to another vendor is a
//     configuration change, not a code change, and the client never learns which
//     vendor answered.
//   * Requests are routed to a model chosen for the intent.
//   * Every call is rate limited per organization and written to ai_audit_logs.
// =============================================================================

import { fail, json, preflight } from '../_shared/cors.ts'
import { adminClient, resolveCaller } from '../_shared/supabase.ts'

type Intent = 'chat' | 'document' | 'analysis' | 'summary' | 'reasoning'

interface RequestBody {
  prompt: string
  module?: string
  intent?: Intent
  context?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

const PROVIDERS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: {
      chat: 'llama-3.3-70b-versatile',
      document: 'llama-3.3-70b-versatile',
      analysis: 'llama-3.3-70b-versatile',
      summary: 'llama-3.1-8b-instant',
      reasoning: 'llama-3.3-70b-versatile',
    },
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: {
      chat: 'gpt-4o-mini',
      document: 'gpt-4o',
      analysis: 'gpt-4o',
      summary: 'gpt-4o-mini',
      reasoning: 'gpt-4o',
    },
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: {
      chat: 'meta-llama/llama-3.3-70b-instruct',
      document: 'meta-llama/llama-3.3-70b-instruct',
      analysis: 'meta-llama/llama-3.3-70b-instruct',
      summary: 'meta-llama/llama-3.1-8b-instruct',
      reasoning: 'meta-llama/llama-3.3-70b-instruct',
    },
  },
} as const

type ProviderKey = keyof typeof PROVIDERS

const SYSTEM_PROMPT = `You are the NegoLinks Intelligence Engine, the assistant built into a nonprofit management platform.

You advise people running NGOs, foundations and humanitarian programmes. You understand grants, restricted and unrestricted funding, logframes, indicators, beneficiary safeguarding, donor compliance and field operations.

Rules you always follow:
- Answer only from the organizational data supplied to you. If the data does not contain the answer, say so plainly rather than estimating.
- Give specific figures and names from the data instead of generalities.
- Be concise and practical. Lead with the answer, then the reasoning.
- When you identify a risk, say what should be done about it.
- Never invent beneficiary details, financial figures or donor commitments.
- Never reveal which company or model produced your response. You are the NegoLinks Intelligence Engine.
- Use the currency and date conventions present in the supplied data.`

Deno.serve(async (req: Request) => {
  const cors = preflight(req)
  if (cors) return cors

  const started = Date.now()

  try {
    const caller = await resolveCaller(req)
    if (!caller) return fail('Not authorized', 401)

    const body = (await req.json()) as RequestBody
    if (!body?.prompt?.trim()) return fail('A prompt is required')

    const db = adminClient()

    // ---- Configuration and rate limit ------------------------------------
    const { data: config } = await db
      .from('ai_configurations')
      .select('*')
      .eq('org_id', caller.orgId)
      .maybeSingle()

    if (config && config.is_enabled === false) {
      return fail('AI features are switched off for this organization', 403)
    }

    const monthlyLimit = (config?.monthly_limit as number) ?? 5000
    const since = new Date()
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const { count } = await db
      .from('ai_audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', caller.orgId)
      .gte('created_at', since.toISOString())

    if ((count ?? 0) >= monthlyLimit) {
      return fail(
        'This organization has reached its monthly AI request limit. Raise the limit in Settings > AI Platform.',
        429,
      )
    }

    // ---- Provider selection ----------------------------------------------
    const providerKey = ((Deno.env.get('AI_PROVIDER') ?? config?.provider ?? 'groq') as ProviderKey)
    const provider = PROVIDERS[providerKey] ?? PROVIDERS.groq
    const apiKey = Deno.env.get('AI_API_KEY')

    if (!apiKey) {
      return fail(
        'The AI service is not configured. Set the AI_API_KEY secret on this project to enable it.',
        503,
      )
    }

    const intent: Intent = body.intent ?? 'chat'
    const routing = (config?.model_routing ?? {}) as Record<string, string>
    const model =
      routing[intent] ?? provider.models[intent] ?? (config?.default_model as string) ?? provider.models.chat

    // ---- Compose the conversation ----------------------------------------
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(body.context
        ? [
            {
              role: 'system',
              content: `Current organizational data for the ${body.module ?? 'workspace'} module:\n\n${body.context.slice(0, 24_000)}`,
            },
          ]
        : []),
      ...(body.history ?? []).slice(-8),
      { role: 'user', content: body.prompt },
    ]

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: (config?.temperature as number) ?? 0.4,
        max_tokens: (config?.max_tokens as number) ?? 2048,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      await db.from('ai_audit_logs').insert({
        org_id: caller.orgId,
        user_id: caller.userId,
        module: body.module ?? 'dashboard',
        intent,
        model,
        prompt_chars: body.prompt.length,
        latency_ms: Date.now() - started,
        succeeded: false,
        error_text: detail.slice(0, 500),
      })
      return fail('The AI service could not complete this request. Please try again.', 502)
    }

    const payload = await response.json()
    const text: string = payload?.choices?.[0]?.message?.content ?? ''

    await db.from('ai_audit_logs').insert({
      org_id: caller.orgId,
      user_id: caller.userId,
      module: body.module ?? 'dashboard',
      intent,
      model,
      prompt_chars: body.prompt.length,
      output_chars: text.length,
      latency_ms: Date.now() - started,
      succeeded: true,
    })

    // The provider name is deliberately not returned to the client.
    return json({ text, intent, module: body.module ?? 'dashboard' })
  } catch (error) {
    return fail((error as Error).message ?? 'Unexpected error', 500)
  }
})
