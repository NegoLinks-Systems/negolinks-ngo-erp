import { useState, type FC, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react'
import { BRAND, PRODUCT, env } from '@/constants'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app.store'

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Platform', href: '/platform' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export const PublicLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const session = useAppStore((state) => state.session)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header
        className="sticky top-0 z-50 border-b border-line"
        style={{ background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex h-16 w-full max-w-content items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src={BRAND.logo} alt="NegoLinks" className="h-9 w-9 object-contain" />
            <span className="hidden sm:block">
              <span className="nl-gold-text block font-display text-base font-black leading-none">{BRAND.name}</span>
              <span className="block text-[10px] uppercase tracking-wider text-ink-3">{PRODUCT.shortName}</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-accent-light' : 'text-ink-2 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-card-alt"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to={session ? '/app' : '/login'} className="nl-btn nl-btn-primary hidden sm:inline-flex">
              {session ? 'Open Workspace' : 'Sign In'}
              <ArrowRight size={15} />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-card-alt lg:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-line bg-surface lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block border-b border-line px-5 py-3.5 text-sm font-medium',
                    isActive ? 'text-accent-light' : 'text-ink-2',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="p-4">
              <Link to={session ? '/app' : '/login'} className="nl-btn nl-btn-primary w-full" onClick={() => setMenuOpen(false)}>
                {session ? 'Open Workspace' : 'Sign In'}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid w-full max-w-content gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-2.5">
              <img src={BRAND.logo} alt="" className="h-9 w-9 object-contain" />
              <span className="nl-gold-text font-display text-base font-black">{BRAND.name}</span>
            </div>
            <p className="max-w-sm text-sm text-ink-2">{PRODUCT.name}</p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink-3">
              A complete nonprofit business operating system: programmes, grants, donors, beneficiaries,
              monitoring and evaluation, finance and field operations in a single AI-powered platform.
            </p>
          </div>

          <div>
            <p className="nl-section-title mb-3">Platform</p>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link to="/platform" className="hover:text-accent-light">Capabilities</Link></li>
              <li><Link to="/solutions" className="hover:text-accent-light">Who it is for</Link></li>
              <li><Link to="/verify" className="hover:text-accent-light">Verify a document</Link></li>
              <li><Link to="/login" className="hover:text-accent-light">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="nl-section-title mb-3">Contact</p>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><a href={`mailto:${env.supportEmail}`} className="hover:text-accent-light">{env.supportEmail}</a></li>
              <li><a href={`tel:${env.supportPhone.replace(/\s/g, '')}`} className="hover:text-accent-light">{env.supportPhone}</a></li>
              <li>
                <a href={BRAND.website} target="_blank" rel="noreferrer" className="hover:text-accent-light">
                  negolinks.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line px-4 py-5 text-center sm:px-6">
          <p className="text-xs text-ink-3">
            Powered by{' '}
            <a href={BRAND.website} target="_blank" rel="noreferrer" className="font-semibold hover:text-accent-light">
              {BRAND.suite}
            </a>
          </p>
          <p className="mt-1 text-xs text-ink-3">
            © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
