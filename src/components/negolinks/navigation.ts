import {
  Activity,
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Coins,
  Compass,
  FileText,
  FolderKanban,
  Gauge,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  Megaphone,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/constants'

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  flag?: string
  roles?: Role[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Executive Dashboard', icon: LayoutDashboard, href: '/app' },
      { label: 'Calendar', icon: CalendarDays, href: '/app/calendar' },
      { label: 'Approvals', icon: ClipboardCheck, href: '/app/approvals' },
    ],
  },
  {
    title: 'Programmes',
    items: [
      { label: 'Programs', icon: Compass, href: '/app/programs' },
      { label: 'Projects', icon: FolderKanban, href: '/app/projects' },
      { label: 'Logframe', icon: Target, href: '/app/logframe' },
      { label: 'MEL & Impact', icon: BarChart3, href: '/app/mel' },
      { label: 'Learning', icon: GraduationCap, href: '/app/learning' },
    ],
  },
  {
    title: 'Funding',
    items: [
      { label: 'Donors', icon: HeartHandshake, href: '/app/donors' },
      { label: 'Grants', icon: HandCoins, href: '/app/grants' },
      { label: 'Fundraising', icon: Megaphone, href: '/app/fundraising' },
    ],
  },
  {
    title: 'Communities',
    items: [
      { label: 'Beneficiaries', icon: UsersRound, href: '/app/beneficiaries' },
      { label: 'Case Management', icon: LifeBuoy, href: '/app/cases', flag: 'module_cases' },
      { label: 'Field Operations', icon: MapPinned, href: '/app/field' },
      { label: 'Volunteers', icon: Users, href: '/app/volunteers' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Finance', icon: Wallet, href: '/app/finance', flag: 'module_finance' },
      { label: 'Budgets', icon: Coins, href: '/app/budgets', flag: 'module_finance' },
      { label: 'Procurement', icon: ShoppingCart, href: '/app/procurement', flag: 'module_procurement' },
      { label: 'Inventory', icon: Package, href: '/app/inventory', flag: 'module_inventory' },
      { label: 'Assets', icon: Boxes, href: '/app/assets', flag: 'module_inventory' },
      { label: 'Fleet', icon: Truck, href: '/app/fleet', flag: 'module_fleet' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { label: 'Staff & HR', icon: Briefcase, href: '/app/hr', flag: 'module_hr' },
      { label: 'Partners', icon: Handshake, href: '/app/partners' },
      { label: 'Governance', icon: Landmark, href: '/app/governance', flag: 'module_governance' },
      { label: 'Compliance', icon: ShieldCheck, href: '/app/compliance' },
      { label: 'Risk Register', icon: Activity, href: '/app/risks' },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { label: 'Documents', icon: FileText, href: '/app/documents' },
      { label: 'Reports', icon: ScrollText, href: '/app/reports' },
      { label: 'Analytics', icon: Gauge, href: '/app/analytics' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organization', icon: Building2, href: '/app/settings/organization', roles: ['super_admin', 'admin'] },
      { label: 'Settings', icon: Settings, href: '/app/settings' },
    ],
  },
]

/** Bottom navigation on phones — the five most-used destinations. */
export const MOBILE_NAV: NavItem[] = [
  { label: 'Home', icon: LayoutDashboard, href: '/app' },
  { label: 'Projects', icon: FolderKanban, href: '/app/projects' },
  { label: 'Grants', icon: HandCoins, href: '/app/grants' },
  { label: 'Field', icon: MapPinned, href: '/app/field' },
  { label: 'Finance', icon: Banknote, href: '/app/finance' },
]
