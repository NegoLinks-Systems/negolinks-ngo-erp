import en from './locales/en.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import pt from './locales/pt.json'

export type LocaleCode = 'en' | 'fr' | 'ar' | 'pt'

export const LOCALES: { code: LocaleCode; label: string; nativeLabel: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'fr', label: 'French', nativeLabel: 'Français', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', rtl: false },
]

type Dictionary = Record<string, string>

const DICTIONARIES: Record<LocaleCode, Dictionary> = { en, fr, ar, pt }

const STORAGE_KEY = 'negolinks-ngo-locale'

export const getLocale = (): LocaleCode => {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleCode | null
  return stored && stored in DICTIONARIES ? stored : 'en'
}

export const setLocale = (code: LocaleCode): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, code)
  applyDirection(code)
}

/** Applies text direction to the document for right-to-left languages. */
export const applyDirection = (code: LocaleCode): void => {
  if (typeof document === 'undefined') return
  const locale = LOCALES.find((item) => item.code === code)
  document.documentElement.dir = locale?.rtl ? 'rtl' : 'ltr'
  document.documentElement.lang = code
}

/**
 * Translates a key, falling back to English and then to the key itself so a
 * missing string never renders as blank.
 */
export const t = (key: string, variables?: Record<string, string | number>): string => {
  const code = getLocale()
  const template = DICTIONARIES[code]?.[key] ?? DICTIONARIES.en[key] ?? key
  if (!variables) return template
  return Object.entries(variables).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  )
}
