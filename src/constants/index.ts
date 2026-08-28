/**
 * NegoLinks fixed brand constants + NGO ERP product identity.
 * Sourced from the NegoLinks Branding and Product Portfolio standards.
 * Values here are brand-level and must not be made editable by customers.
 */

export const APP_VERSION = '1.1.0'
export const SCHEMA_VERSION = '013'
export const RELEASE_DATE = '2026-08-27'
export const ENTERPRISE_STANDARD = 'NegoLinks Enterprise Standard v1.0'

export const BRAND = {
  name: 'NegoLinks',
  legalName: 'Nego Links Systems Ltd',
  suite: 'NegoLinks Enterprise Suite',
  website: 'https://negolinks.com',
  logo: '/negolinks-logo.png',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
} as const

export const PRODUCT = {
  name: 'NegoLinks NGO & Nonprofit Management ERP',
  shortName: 'NGO ERP',
  subtitle: 'NGO & Nonprofit Management ERP',
  slug: 'ngo',
  url: 'https://ngo.negolinks.com',
  tagline: 'The Nonprofit Business Operating System',
  accent: {
    name: 'Humanity Violet',
    primary: '#7C3AED',
    light: '#A78BFA',
    deep: '#6D28D9',
  },
} as const

/** Humanitarian chart palette — accent-led, per branding standard Part 5. */
export const CHART_COLORS = ['#7C3AED', '#A78BFA', '#22C55E', '#0EA5E9', '#F59E0B', '#EC4899'] as const

export const STATUS_COLORS = {
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  neutral: '#5A5A78',
} as const

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? PRODUCT.name,
  appShortName: import.meta.env.VITE_APP_SHORT_NAME ?? PRODUCT.shortName,
  appUrl: import.meta.env.VITE_APP_URL ?? PRODUCT.url,
  appSlug: import.meta.env.VITE_APP_SLUG ?? PRODUCT.slug,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  defaultAiProvider: import.meta.env.VITE_DEFAULT_AI_PROVIDER ?? 'groq',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? 'info@negolinks.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE ?? '+2348063337624',
  supportWebsite: import.meta.env.VITE_SUPPORT_WEBSITE ?? BRAND.website,
  verifyBaseUrl: import.meta.env.VITE_VERIFY_BASE_URL ?? `${PRODUCT.url}/verify`,
}

/** True when Supabase credentials are present. */
export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

export const AI_BRAND = {
  platform: 'NegoLinks Intelligence Engine',
  assistant: 'Executive Assistant',
  insights: 'Smart Insights',
  analysis: 'AI Analysis',
  short: 'AI Assistance',
} as const

export const ROLES = [
  'super_admin',
  'admin',
  'manager',
  'staff',
  'viewer',
  'auditor',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
  auditor: 'Auditor',
}

/**
 * Seniority rank, not a score: 1 is the most privileged.
 * Compare with <= when testing whether a role meets a minimum, e.g.
 * `ROLE_LEVEL[role] <= ROLE_LEVEL.manager` means "manager or above".
 */
export const ROLE_LEVEL: Record<Role, number> = {
  super_admin: 1,
  admin: 2,
  manager: 3,
  staff: 4,
  viewer: 5,
  auditor: 6,
}

/** Job titles used for role-specific default dashboards. */
export const JOB_PROFILES = [
  'Executive Director',
  'Program Manager',
  'Project Manager',
  'Finance Manager',
  'MEL Officer',
  'Field Officer',
  'Donor Relations Officer',
  'HR Manager',
  'Procurement Officer',
] as const

export const ORGANIZATION_TYPES = [
  'NGO',
  'Nonprofit Organization',
  'Foundation',
  'Charity',
  'Community-Based Organization',
  'Faith-Based Organization',
  'Humanitarian Organization',
  'Development Organization',
  'International NGO',
  'Social Enterprise',
  'Research Organization',
  'Advocacy Organization',
  'Youth Organization',
  "Women's Organization",
  'Environmental Organization',
  'Health Organization',
  'Education Organization',
  'Human Rights Organization',
  'Disaster Relief Organization',
  'Government-funded Development Programme',
  'Donor-funded Project',
] as const

export const PROJECT_STATUSES = [
  'draft',
  'proposal',
  'pending_approval',
  'approved',
  'active',
  'suspended',
  'completed',
  'closed',
] as const

export const GRANT_STAGES = [
  'opportunity',
  'research',
  'application',
  'submitted',
  'under_review',
  'awarded',
  'active',
  'reporting',
  'closed',
] as const

export const GRANT_STAGE_LABELS: Record<string, string> = {
  opportunity: 'Opportunity',
  research: 'Research',
  application: 'Application',
  submitted: 'Submitted',
  under_review: 'Under Review',
  awarded: 'Awarded',
  active: 'Active',
  reporting: 'Reporting',
  closed: 'Closed',
}

export const DONOR_TYPES = [
  'Individual',
  'Institutional',
  'Foundation',
  'Government',
  'Corporate',
  'International Development Agency',
  'Philanthropic Organization',
] as const

export const VULNERABILITY_CATEGORIES = [
  'Internally Displaced',
  'Refugee',
  'Orphan / Vulnerable Child',
  'Person With Disability',
  'Female-Headed Household',
  'Elderly',
  'Chronically Ill',
  'Out-of-School Child',
  'Survivor of Violence',
  'Low Income',
] as const

export const CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', decimals: 0 },
] as const

export const DEMO_SCENARIOS = [
  { id: 'small', label: 'Small Organization', hint: 'Community-based NGO — light data set' },
  { id: 'medium', label: 'Medium Organization', hint: 'National NGO — mid-scale data set' },
  { id: 'large', label: 'Large Enterprise', hint: 'International NGO — full scale' },
  { id: 'multi_branch', label: 'Multi-Branch Enterprise', hint: 'Field offices across 5+ locations' },
  { id: 'heavy', label: 'Enterprise with Heavy Daily Transactions', hint: 'High-volume transactional data' },
] as const

export type DemoScenarioId = (typeof DEMO_SCENARIOS)[number]['id']

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25
export const SEARCH_DEBOUNCE_MS = 300
export const AI_RATE_LIMIT_PER_HOUR = 200
export const MAX_UPLOAD_MB = 10
