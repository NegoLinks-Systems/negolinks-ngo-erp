import { type FC } from 'react'
import { BRAND, PRODUCT } from '@/constants'

/**
 * Splash screen. Per the branding standard this is a fixed dark brand moment —
 * it does not follow the light/dark toggle.
 */
export const SplashScreen: FC<{ progress?: number }> = ({ progress = 70 }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden" style={{ background: '#080810' }}>
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(60% 50% at 50% 42%, rgba(124,58,237,0.24), transparent 70%), radial-gradient(40% 30% at 78% 78%, rgba(167,139,250,0.14), transparent 70%)',
      }}
    />
    <svg className="absolute inset-0 h-full w-full opacity-[0.10]" aria-hidden="true">
      <defs>
        <pattern id="splash-grid" width="46" height="46" patternUnits="userSpaceOnUse">
          <path d="M46 0H0V46" fill="none" stroke="#A78BFA" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#splash-grid)" />
    </svg>

    <div className="relative flex flex-col items-center px-6 text-center">
      <div className="relative mb-6 h-24 w-24">
        <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ background: 'rgba(124,58,237,0.3)' }} />
        <span
          className="absolute -inset-3 animate-pulse-ring rounded-full"
          style={{ background: 'rgba(124,58,237,0.16)', animationDelay: '0.7s' }}
        />
        <img src={BRAND.logo} alt="NegoLinks" className="relative h-24 w-24 animate-heartbeat object-contain" />
      </div>

      <h1 className="nl-gold-text font-display text-3xl font-black tracking-tight">{BRAND.name}</h1>
      <p className="mt-1 text-sm font-semibold text-white sm:text-base">{PRODUCT.subtitle}</p>
      <p className="mt-4 text-xs tracking-wide" style={{ color: '#5A5A78' }}>
        Loading Enterprise Platform<span className="animate-pulse">…</span>
      </p>

      <div className="mt-6 h-1 w-56 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
        />
      </div>
    </div>

    <p className="absolute bottom-6 text-[11px]" style={{ color: '#5A5A78' }}>
      Powered by {BRAND.suite}
    </p>
  </div>
)

export default SplashScreen
