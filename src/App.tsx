import { Component, Suspense, lazy, useEffect, useState, type FC, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAppStore } from '@/stores/app.store'
import { PageLoader } from '@/components/negolinks/Primitives'
import SplashScreen from '@/pages/auth/SplashScreen'
import LoginPage from '@/pages/auth/LoginPage'
import { AboutPage as PublicAboutPage, ContactPage, HomePage, NotFoundPage, PlatformPage, SolutionsPage, VerifyPage } from '@/pages/public'

const DonatePage = lazy(() => import('@/pages/public/DonatePage'))

const ExecutiveDashboard = lazy(() => import('@/pages/dashboard/ExecutiveDashboard'))
const GrantsPage = lazy(() => import('@/pages/grants/GrantsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
})

/* ------------------------------------------------------ error boundary */

interface BoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
          <div className="nl-card max-w-md p-7 text-center">
            <h1 className="font-display text-lg font-bold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-2">
              The page could not be displayed. Your data is safe. Reloading usually resolves this.
            </p>
            <p className="mt-3 break-words rounded-lg p-3 text-left font-mono text-[11px] text-ink-3" style={{ background: 'var(--bg-card-alt)' }}>
              {this.state.error.message}
            </p>
            <button type="button" className="nl-btn nl-btn-primary mt-5 w-full" onClick={() => window.location.reload()}>
              Reload the application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* -------------------------------------------------------- route guards */

const ScrollToTop: FC = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const session = useAppStore((state) => state.session)
  const booted = useAppStore((state) => state.booted)
  if (!booted) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

/* ----------------------------------------------------------- lazy pages */

const lazyNamed = <K extends string,>(loader: () => Promise<Record<K, FC>>, name: K) =>
  lazy(async () => {
    const module = await loader()
    return { default: module[name] }
  })

const ProgramsPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'ProgramsPage')
const ProjectsPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'ProjectsPage')
const DonorsPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'DonorsPage')
const PartnersPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'PartnersPage')
const VolunteersPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'VolunteersPage')
const HRPage = lazyNamed(() => import('@/pages/modules/CoreModules'), 'HRPage')

const MELPage = lazyNamed(() => import('@/pages/mel/MELPage'), 'MELPage')
const LogframePage = lazyNamed(() => import('@/pages/mel/MELPage'), 'LogframePage')
const LearningPage = lazyNamed(() => import('@/pages/mel/MELPage'), 'LearningPage')

const BeneficiariesPage = lazyNamed(() => import('@/pages/beneficiaries/BeneficiariesPage'), 'BeneficiariesPage')
const CasesPage = lazyNamed(() => import('@/pages/beneficiaries/BeneficiariesPage'), 'CasesPage')
const FieldOperationsPage = lazyNamed(() => import('@/pages/beneficiaries/BeneficiariesPage'), 'FieldOperationsPage')

const FinancePage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'FinancePage')
const BudgetsPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'BudgetsPage')
const ProcurementPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'ProcurementPage')
const InventoryPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'InventoryPage')
const AssetsPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'AssetsPage')
const FleetPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'FleetPage')
const CompliancePage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'CompliancePage')
const RisksPage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'RisksPage')
const GovernancePage = lazyNamed(() => import('@/pages/finance/OperationsModules'), 'GovernancePage')

const FundraisingPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'FundraisingPage')
const DocumentsPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'DocumentsPage')
const CalendarPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'CalendarPage')
const ApprovalsPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'ApprovalsPage')
const AnalyticsPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'AnalyticsPage')
const ReportsPage = lazyNamed(() => import('@/pages/reports/ReportsPage'), 'ReportsPage')

const SettingsHubPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'SettingsHubPage')
const OrganizationSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'OrganizationSettingsPage')
const UsersSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'UsersSettingsPage')
const AISettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'AISettingsPage')
const FeatureSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'FeatureSettingsPage')
const DemoDataPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'DemoDataPage')
const AuditPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'AuditPage')
const CommunicationSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'CommunicationSettingsPage')
const ApiSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'ApiSettingsPage')
const SystemPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'SystemPage')
const ProfilePage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'ProfilePage')
const AboutSettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPages'), 'AboutPage')

/* ------------------------------------------------------------- routes */

const APP_ROUTES: { path: string; element: FC }[] = [
  { path: 'programs', element: ProgramsPage },
  { path: 'projects', element: ProjectsPage },
  { path: 'logframe', element: LogframePage },
  { path: 'mel', element: MELPage },
  { path: 'learning', element: LearningPage },
  { path: 'donors', element: DonorsPage },
  { path: 'grants', element: GrantsPage },
  { path: 'fundraising', element: FundraisingPage },
  { path: 'beneficiaries', element: BeneficiariesPage },
  { path: 'cases', element: CasesPage },
  { path: 'field', element: FieldOperationsPage },
  { path: 'volunteers', element: VolunteersPage },
  { path: 'finance', element: FinancePage },
  { path: 'budgets', element: BudgetsPage },
  { path: 'procurement', element: ProcurementPage },
  { path: 'inventory', element: InventoryPage },
  { path: 'assets', element: AssetsPage },
  { path: 'fleet', element: FleetPage },
  { path: 'hr', element: HRPage },
  { path: 'partners', element: PartnersPage },
  { path: 'governance', element: GovernancePage },
  { path: 'compliance', element: CompliancePage },
  { path: 'risks', element: RisksPage },
  { path: 'documents', element: DocumentsPage },
  { path: 'reports', element: ReportsPage },
  { path: 'analytics', element: AnalyticsPage },
  { path: 'calendar', element: CalendarPage },
  { path: 'approvals', element: ApprovalsPage },
  { path: 'settings', element: SettingsHubPage },
  { path: 'settings/organization', element: OrganizationSettingsPage },
  { path: 'settings/users', element: UsersSettingsPage },
  { path: 'settings/ai', element: AISettingsPage },
  { path: 'settings/features', element: FeatureSettingsPage },
  { path: 'settings/demo', element: DemoDataPage },
  { path: 'settings/audit', element: AuditPage },
  { path: 'settings/communication', element: CommunicationSettingsPage },
  { path: 'settings/notifications', element: CommunicationSettingsPage },
  { path: 'settings/api', element: ApiSettingsPage },
  { path: 'settings/system', element: SystemPage },
  { path: 'settings/profile', element: ProfilePage },
  { path: 'settings/about', element: AboutSettingsPage },
]

export const App: FC = () => {
  const boot = useAppStore((state) => state.boot)
  const booted = useAppStore((state) => state.booted)
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    void boot()
    const timer = window.setTimeout(() => setSplashDone(true), 1400)
    return () => window.clearTimeout(timer)
  }, [boot])

  if (!booted || !splashDone) return <SplashScreen progress={booted ? 100 : 60} />

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/platform" element={<PlatformPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/about" element={<PublicAboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/verify/:code" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <ExecutiveDashboard />
                  </ProtectedRoute>
                }
              />
              {APP_ROUTES.map(({ path, element: Element }) => (
                <Route
                  key={path}
                  path={`/app/${path}`}
                  element={
                    <ProtectedRoute>
                      <Element />
                    </ProtectedRoute>
                  }
                />
              ))}

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-border)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
