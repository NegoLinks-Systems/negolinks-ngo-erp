import { useEffect, useMemo, useState, type FC } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, HandHeart, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PublicLayout } from '@/components/public/PublicLayout'
import { ProgressBar } from '@/components/negolinks/Primitives'
import {
  publicSiteService,
  type PublicCampaign,
  type PublicOrganization,
} from '@/lib/services/publicSite.service'
import { formatCurrency, percentOf, toMinor } from '@/lib/utils'

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000]

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Card',
  'Mobile Money',
  'Cheque',
  'Cash',
  'In Kind',
]

export const DonatePage: FC = () => {
  const [organization, setOrganization] = useState<PublicOrganization | null>(null)
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const [amount, setAmount] = useState<number>(25000)
  const [customAmount, setCustomAmount] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [donorName, setDonorName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState('Bank Transfer')
  const [anonymous, setAnonymous] = useState(false)
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [org, list] = await Promise.all([
          publicSiteService.organization(),
          publicSiteService.activeCampaigns(),
        ])
        if (!active) return
        setOrganization(org)
        setCampaigns(list)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const currency = organization?.base_currency ?? 'NGN'

  const effectiveAmount = useMemo(() => {
    const parsed = Number(customAmount)
    if (customAmount.trim() && Number.isFinite(parsed) && parsed > 0) return parsed
    return amount
  }, [amount, customAmount])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId) ?? null

  const submit = async (): Promise<void> => {
    setError(null)

    if (!anonymous && !donorName.trim()) {
      setError('Please tell us who this gift is from, or choose to give anonymously.')
      return
    }
    if (effectiveAmount <= 0) {
      setError('Please enter an amount greater than zero.')
      return
    }

    setSubmitting(true)
    try {
      const created = await publicSiteService.donate({
        donorName: anonymous ? 'Anonymous Supporter' : donorName.trim(),
        amountMinor: toMinor(effectiveAmount),
        email: email.trim() || null,
        phone: phone.trim() || null,
        campaignId: campaignId || null,
        currency,
        paymentMethod: method,
        isAnonymous: anonymous,
        message: message.trim() || null,
      })
      setReference(created)
      toast.success('Thank you. Your pledge has been recorded.')
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  /* --------------------------------------------------------- thank you */

  if (reference) {
    return (
      <PublicLayout>
        <section className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
          <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
          <h1 className="font-display text-3xl font-black text-ink">Thank you</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
            Your pledge of {formatCurrency(toMinor(effectiveAmount), currency)} has been recorded and our
            team has been notified. Please quote this reference when you send the funds.
          </p>

          <p
            className="mx-auto mt-6 inline-block rounded-xl px-6 py-3 font-mono text-lg font-bold"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent-light)' }}
          >
            {reference}
          </p>

          {organization ? (
            <div className="nl-card mt-8 p-6 text-left">
              <p className="nl-section-title mb-3">How to complete your gift</p>
              <p className="text-sm leading-relaxed text-ink-2">
                Transfer your gift to {organization.legal_name || organization.name} using the reference
                above, then contact us and we will confirm receipt and issue your acknowledgement.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                {organization.email ? (
                  <div className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-ink-3">Email</dt>
                    <dd className="text-ink-2">{organization.email}</dd>
                  </div>
                ) : null}
                {organization.phone ? (
                  <div className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-ink-3">Phone</dt>
                    <dd className="text-ink-2">{organization.phone}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="nl-btn nl-btn-ghost px-6">
              Back to home
            </Link>
            <button
              type="button"
              className="nl-btn nl-btn-primary px-6"
              onClick={() => {
                setReference(null)
                setDonorName('')
                setEmail('')
                setPhone('')
                setMessage('')
                setCustomAmount('')
              }}
            >
              Give again
            </button>
          </div>
        </section>
      </PublicLayout>
    )
  }

  /* ------------------------------------------------------------- form */

  return (
    <PublicLayout>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-content px-4 py-14 sm:px-6">
          <span
            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
          >
            <HandHeart size={22} />
          </span>
          <h1 className="font-display text-4xl font-black text-ink">
            Support {organization?.name ?? 'our work'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
            {organization?.mission ??
              'Every gift goes directly towards the programmes we run with the communities we serve.'}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-content px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="nl-card p-6 lg:col-span-2 sm:p-8">
            {error ? (
              <div
                className="mb-5 rounded-lg p-3 text-xs"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
              >
                <span className="text-danger">{error}</span>
              </div>
            ) : null}

            <fieldset className="mb-6">
              <legend className="nl-section-title mb-3">Choose an amount</legend>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AMOUNTS.map((preset) => {
                  const active = !customAmount.trim() && amount === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmount(preset)
                        setCustomAmount('')
                      }}
                      className="rounded-xl border px-2 py-3 text-sm font-bold transition-all"
                      style={{
                        borderColor: active ? 'var(--accent-primary)' : 'var(--bg-border)',
                        background: active ? 'var(--accent-glow)' : 'transparent',
                        color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                      }}
                    >
                      {formatCurrency(toMinor(preset), currency)}
                    </button>
                  )
                })}
              </div>

              <label className="nl-label mt-4" htmlFor="customAmount">
                Or enter another amount
              </label>
              <input
                id="customAmount"
                type="number"
                min={1}
                step="0.01"
                className="nl-input"
                placeholder="Any amount"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
              />
            </fieldset>

            {campaigns.length ? (
              <fieldset className="mb-6">
                <legend className="nl-section-title mb-3">Give towards</legend>
                <select
                  className="nl-input"
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                  aria-label="Choose a campaign"
                >
                  <option value="">Wherever the need is greatest</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>

                {selectedCampaign ? (
                  <div className="mt-3 rounded-lg border border-line p-3">
                    {selectedCampaign.description ? (
                      <p className="mb-2 text-xs leading-relaxed text-ink-2">{selectedCampaign.description}</p>
                    ) : null}
                    <ProgressBar
                      value={percentOf(selectedCampaign.raised_minor, selectedCampaign.target_minor)}
                      showLabel
                    />
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      {formatCurrency(selectedCampaign.raised_minor, selectedCampaign.currency)} raised of{' '}
                      {formatCurrency(selectedCampaign.target_minor, selectedCampaign.currency)}
                    </p>
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            <fieldset className="mb-6">
              <legend className="nl-section-title mb-3">Your details</legend>

              <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                Give anonymously
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {!anonymous ? (
                  <div className="sm:col-span-2">
                    <label className="nl-label" htmlFor="donorName">
                      Your name
                    </label>
                    <input
                      id="donorName"
                      className="nl-input"
                      placeholder="Full name or organization"
                      value={donorName}
                      onChange={(event) => setDonorName(event.target.value)}
                    />
                  </div>
                ) : null}

                <div>
                  <label className="nl-label" htmlFor="donorEmail">
                    Email <span className="font-normal text-ink-3">(for your receipt)</span>
                  </label>
                  <input
                    id="donorEmail"
                    type="email"
                    className="nl-input"
                    placeholder="you@example.org"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div>
                  <label className="nl-label" htmlFor="donorPhone">
                    Phone <span className="font-normal text-ink-3">(optional)</span>
                  </label>
                  <input
                    id="donorPhone"
                    className="nl-input"
                    placeholder="+234 …"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>

                <div>
                  <label className="nl-label" htmlFor="method">
                    How you would like to give
                  </label>
                  <select
                    id="method"
                    className="nl-input"
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {PAYMENT_METHODS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="nl-label" htmlFor="donorMessage">
                    Message <span className="font-normal text-ink-3">(optional)</span>
                  </label>
                  <textarea
                    id="donorMessage"
                    rows={3}
                    className="nl-input resize-y"
                    placeholder="Anything you would like us to know about your gift"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <button
              type="button"
              className="nl-btn nl-btn-primary w-full py-3.5 text-base"
              onClick={() => void submit()}
              disabled={submitting || loading}
            >
              {submitting ? <Loader2 size={17} className="animate-spin" /> : <HandHeart size={17} />}
              {submitting
                ? 'Recording your pledge…'
                : `Pledge ${formatCurrency(toMinor(effectiveAmount), currency)}`}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-3">
              This form records your intention to give. No payment is taken here — we will contact you with
              transfer details and confirm receipt.
            </p>
          </div>

          <aside className="space-y-4">
            <div className="nl-card p-6">
              <ShieldCheck size={20} className="mb-3" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-display text-sm font-bold text-ink">Your gift is accounted for</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">
                Every pledge enters our finance system against the fund you chose. Restricted gifts are
                tracked separately from general funds, so what you give towards is what it is spent on.
              </p>
            </div>

            {campaigns.length ? (
              <div className="nl-card p-6">
                <h2 className="nl-section-title mb-3">Current appeals</h2>
                <ul className="space-y-4">
                  {campaigns.slice(0, 4).map((campaign) => (
                    <li key={campaign.id}>
                      <button
                        type="button"
                        className="mb-1.5 text-left text-xs font-semibold text-ink hover:text-accent-light"
                        onClick={() => setCampaignId(campaign.id)}
                      >
                        {campaign.name}
                      </button>
                      <ProgressBar value={percentOf(campaign.raised_minor, campaign.target_minor)} />
                      <p className="mt-1 text-[11px] text-ink-3">
                        {formatCurrency(campaign.raised_minor, campaign.currency)} of{' '}
                        {formatCurrency(campaign.target_minor, campaign.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="nl-card p-6">
              <h2 className="nl-section-title mb-2">Other ways to help</h2>
              <p className="text-xs leading-relaxed text-ink-2">
                Corporate partnerships, in-kind donations and volunteering all make a difference.
              </p>
              <Link to="/contact" className="nl-btn nl-btn-ghost mt-4 w-full">
                Talk to us <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  )
}

export default DonatePage
