import { useState, type FC, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { BRAND, PRODUCT, env } from '@/constants'
import { useAppStore } from '@/stores/app.store'
import { authService, isEvaluationMode } from '@/lib/services/auth.service'

/** Left hero: a rotating globe cradled by hands with a pulsing heart core. */
const HumanityHero: FC = () => (
  <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between" style={{ background: '#080810' }}>
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(70% 55% at 40% 40%, rgba(124,58,237,0.30), transparent 72%), radial-gradient(50% 40% at 85% 85%, rgba(167,139,250,0.16), transparent 70%)',
      }}
    />

    <svg viewBox="0 0 520 520" className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      <defs>
        <linearGradient id="globeStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="heartGlow">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Orbit rings */}
      <g className="animate-spin-slow" style={{ transformOrigin: '260px 250px' }}>
        <ellipse cx="260" cy="250" rx="190" ry="72" fill="none" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.5" />
        <ellipse cx="260" cy="250" rx="150" ry="150" fill="none" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.42" />
        <ellipse cx="260" cy="250" rx="72" ry="150" fill="none" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.32" />
        <ellipse cx="260" cy="250" rx="120" ry="150" fill="none" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.22" />
        <line x1="110" y1="250" x2="410" y2="250" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.4" />
        <line x1="130" y1="192" x2="390" y2="192" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.24" />
        <line x1="130" y1="308" x2="390" y2="308" stroke="url(#globeStroke)" strokeWidth="1" opacity="0.24" />
      </g>

      {/* Community nodes on the globe */}
      {[
        [200, 190], [318, 214], [166, 268], [352, 296], [258, 160], [230, 330], [300, 348], [140, 226],
      ].map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="12" fill="#7C3AED" opacity="0.14">
            <animate attributeName="r" values="8;18;8" dur="3.4s" begin={`${index * 0.35}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="3.4s" begin={`${index * 0.35}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r="3.4" fill="#A78BFA" />
        </g>
      ))}

      {/* Heart core */}
      <circle cx="260" cy="250" r="86" fill="url(#heartGlow)" />
      <path
        d="M260 296c-46-30-70-52-70-79 0-18 14-31 31-31 14 0 24 8 39 25 15-17 25-25 39-25 17 0 31 13 31 31 0 27-24 49-70 79z"
        fill="#7C3AED"
        className="animate-heartbeat"
        style={{ transformOrigin: '260px 250px' }}
        opacity="0.92"
      />

      {/* Cradling hands */}
      <path
        d="M118 356c22-8 40-4 58 10 12 9 22 14 34 14h100c12 0 22-5 34-14 18-14 36-18 58-10"
        fill="none"
        stroke="#A78BFA"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M96 386c30-14 56-9 80 8 16 12 30 18 46 18h76c16 0 30-6 46-18 24-17 50-22 80-8"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>

    <div className="relative p-10">
      <img src={BRAND.logo} alt="NegoLinks" className="h-12 w-12 object-contain" />
    </div>

    <div className="relative p-10">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: '#A78BFA' }}>
        {PRODUCT.tagline}
      </p>
      <h2 className="max-w-md font-display text-3xl font-black leading-tight text-white">
        Every donor, grant, project and life you touch — in one intelligent platform.
      </h2>
      <p className="mt-4 max-w-md text-sm" style={{ color: '#A0A0B8' }}>
        Programme management, grants, beneficiaries, MEL, finance and field operations, built for NGOs
        working from a single community to an entire continent.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: '#5A5A78' }}>
        <span>Multi-organization</span>
        <span>Multi-currency</span>
        <span>Donor-ready reporting</span>
        <span>Offline field capture</span>
      </div>
    </div>
  </div>
)

export const LoginPage: FC = () => {
  const session = useAppStore((state) => state.session)
  const signIn = useAppStore((state) => state.signIn)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState(false)

  if (session) return <Navigate to="/app" replace />

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (resetMode) {
      try {
        setSubmitting(true)
        await authService.requestPasswordReset(email)
        toast.success('If that email is registered, a reset link is on its way.')
        setResetMode(false)
      } catch (caught) {
        setError((caught as Error).message)
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!email.trim() || (!isEvaluationMode && !password)) {
      setError('Please enter your email address and password.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#080810' }}>
      <HumanityHero />

      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8">
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: 'radial-gradient(70% 50% at 50% 20%, rgba(124,58,237,0.22), transparent 70%)' }}
        />

        <div className="relative w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs transition-colors hover:text-white"
            style={{ color: '#5A5A78' }}
          >
            <ArrowLeft size={13} /> Back to website
          </Link>

          <div
            className="rounded-[20px] p-7 sm:p-8"
            style={{
              background: 'rgba(19,19,37,0.90)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(124,58,237,0.3)',
            }}
          >
            <div className="mb-7 text-center">
              <img src={BRAND.logo} alt="NegoLinks" className="mx-auto mb-4 h-14 w-14 object-contain" />
              <h1 className="nl-gold-text font-display text-2xl font-black">{BRAND.name}</h1>
              <h2 className="mt-1 text-sm font-semibold text-white">{PRODUCT.subtitle}</h2>
              <p className="mt-2 text-[11px]" style={{ color: '#5A5A78' }}>
                Enterprise AI-Powered Business Management Platform
              </p>
            </div>

            {error ? (
              <div
                className="mb-4 flex items-start gap-2 rounded-lg p-3 text-xs"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0A0B8' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5A5A78' }} />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    className="w-full rounded-lg py-3 pl-9 pr-3 text-sm text-white outline-none transition-all"
                    style={{ background: '#0E0E1C', border: '1px solid rgba(124,58,237,0.3)' }}
                    placeholder="you@organization.org"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onFocus={(event) => {
                      event.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
                      event.target.style.borderColor = '#7C3AED'
                    }}
                    onBlur={(event) => {
                      event.target.style.boxShadow = 'none'
                      event.target.style.borderColor = 'rgba(124,58,237,0.3)'
                    }}
                  />
                </div>
              </div>

              {!resetMode ? (
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0A0B8' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5A5A78' }} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="w-full rounded-lg py-3 pl-9 pr-10 text-sm text-white outline-none transition-all"
                      style={{ background: '#0E0E1C', border: '1px solid rgba(124,58,237,0.3)' }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onFocus={(event) => {
                        event.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
                        event.target.style.borderColor = '#7C3AED'
                      }}
                      onBlur={(event) => {
                        event.target.style.boxShadow = 'none'
                        event.target.style.borderColor = 'rgba(124,58,237,0.3)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded"
                      style={{ color: '#5A5A78' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {resetMode ? 'Send reset link' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setResetMode((value) => !value)
                  setError(null)
                }}
                className="transition-colors hover:text-white"
                style={{ color: '#A78BFA' }}
              >
                {resetMode ? 'Back to sign in' : 'Forgot password?'}
              </button>
              <span className="flex items-center gap-1" style={{ color: '#5A5A78' }}>
                <ShieldCheck size={12} /> Secure Enterprise Login
              </span>
            </div>

            {isEvaluationMode ? (
              <p
                className="mt-5 rounded-lg p-3 text-[11px] leading-relaxed"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#A0A0B8' }}
              >
                <strong style={{ color: '#A78BFA' }}>Evaluation mode.</strong> No backend is connected yet, so any
                email signs you in locally with Super Admin rights. Add your Supabase keys to <code>.env</code> to
                enable full multi-user authentication.
              </p>
            ) : null}
          </div>

          <p className="mt-6 text-center text-[11px]" style={{ color: '#5A5A78' }}>
            Powered by {BRAND.suite}
            <br />© {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
          </p>
          <p className="mt-2 text-center text-[11px]" style={{ color: '#3A3A50' }}>
            {env.supportEmail} • {env.supportPhone}
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
