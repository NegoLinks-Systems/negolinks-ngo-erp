import { getSupabase } from '@/lib/supabase'
import { localAdapter } from '@/lib/localAdapter'
import { PRODUCT } from '@/constants'

/**
 * Data for pages a visitor sees before signing in.
 *
 * Anonymous visitors are never given direct table access. Everything here goes
 * through a small set of database functions that decide exactly what may be read
 * and written, so the public site cannot become a way around row level security.
 */

export interface PublicOrganization {
  id: string
  name: string
  legal_name: string
  mission: string | null
  vision: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string
  base_currency: string
}

export interface PublicCampaign {
  id: string
  name: string
  description: string | null
  target_minor: number
  raised_minor: number
  currency: string
  end_date: string | null
}

export interface DonationInput {
  donorName: string
  amountMinor: number
  email?: string | null
  phone?: string | null
  campaignId?: string | null
  currency?: string | null
  paymentMethod?: string
  isAnonymous?: boolean
  message?: string | null
}

const localReference = (): string =>
  `DON-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`

export const publicSiteService = {
  async organization(): Promise<PublicOrganization | null> {
    const sb = getSupabase()
    if (!sb) {
      const rows = await localAdapter.list('organizations')
      const first = rows[0] as unknown as PublicOrganization | undefined
      return first ?? null
    }
    const { data, error } = await sb.rpc('public_organization_profile')
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as PublicOrganization | undefined
    return row ?? null
  },

  async activeCampaigns(): Promise<PublicCampaign[]> {
    const sb = getSupabase()
    if (!sb) {
      const rows = (await localAdapter.list('campaigns')) as unknown as PublicCampaign[]
      return rows.filter((row) => (row as unknown as { status?: string }).status === 'running').slice(0, 12)
    }
    const { data, error } = await sb.rpc('public_active_campaigns')
    if (error) return []
    return (data ?? []) as PublicCampaign[]
  },

  /**
   * Records a visitor's intention to give.
   *
   * Deliberately written as a pledge, never as money received: finance staff
   * confirm receipt in the Fundraising module once funds actually arrive, so a
   * public form can never inflate reported income.
   */
  async donate(input: DonationInput): Promise<string> {
    const sb = getSupabase()

    if (!sb) {
      // Evaluation mode: keep the pledge locally so the demo remains complete.
      const reference = localReference()
      await localAdapter.put('donations', {
        id: crypto.randomUUID(),
        table: 'donations',
        reference,
        donor_name: input.donorName,
        donation_type: 'pledge',
        amount_minor: input.amountMinor,
        currency: input.currency ?? 'NGN',
        payment_method: input.paymentMethod ?? 'Bank Transfer',
        status: 'pledged',
        is_anonymous: input.isAnonymous ?? false,
        note: input.message ?? null,
        campaign_id: input.campaignId ?? null,
        created_at: new Date().toISOString(),
        is_demo: false,
      })
      return reference
    }

    const { data, error } = await sb.rpc('record_public_donation', {
      p_donor_name: input.donorName,
      p_amount_minor: input.amountMinor,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_campaign_id: input.campaignId ?? null,
      p_currency: input.currency ?? null,
      p_payment_method: input.paymentMethod ?? 'Bank Transfer',
      p_is_anonymous: input.isAnonymous ?? false,
      p_message: input.message ?? null,
    })

    if (error) {
      throw new Error(
        error.message.includes('not accepting donations')
          ? `${PRODUCT.shortName} is not set up to receive donations yet. Please contact the organization directly.`
          : error.message,
      )
    }

    return String(data)
  },
}
