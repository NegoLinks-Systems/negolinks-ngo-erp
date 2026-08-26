import type { Config } from 'tailwindcss'

/**
 * NegoLinks design tokens are exposed as CSS variables (see src/styles/globals.css) so that the
 * light/dark toggle and per-organization corporate colours can re-theme the app at runtime.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-primary)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        'card-alt': 'var(--bg-card-alt)',
        line: 'var(--bg-border)',
        ink: 'var(--text-primary)',
        'ink-2': 'var(--text-secondary)',
        'ink-3': 'var(--text-muted)',
        accent: 'var(--accent-primary)',
        'accent-light': 'var(--accent-light)',
        'accent-deep': 'var(--accent-deep)',
        gold: '#C9A84C',
        'gold-light': '#E8C97A',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { content: '1400px' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        heartbeat: { '0%,100%': { transform: 'scale(1)' }, '12%': { transform: 'scale(1.09)' }, '24%': { transform: 'scale(1)' }, '36%': { transform: 'scale(1.06)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.7)', opacity: '0.7' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
        'fade-up': 'fade-up .4s ease-out both',
        'slide-in': 'slide-in .25s ease-out both',
        heartbeat: 'heartbeat 2.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 40s linear infinite',
        'pulse-ring': 'pulse-ring 2.8s ease-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
