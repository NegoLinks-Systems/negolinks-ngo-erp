/**
 * Single source of truth for physical table names and the modules that own them.
 * Universal Search, the Demo Data Manager, backups and the export framework all
 * iterate this registry so a new module is wired in one place.
 */

export const TABLES = {
  organizations: 'organizations',
  branches: 'branches',
  departments: 'departments',
  users: 'app_users',
  boardMembers: 'board_members',

  programs: 'programs',
  projects: 'projects',
  projectActivities: 'project_activities',
  projectRisks: 'project_risks',
  projectTeam: 'project_team',

  donors: 'donors',
  grants: 'grants',
  grantDisbursements: 'grant_disbursements',
  grantReports: 'grant_reports',

  campaigns: 'campaigns',
  donations: 'donations',

  beneficiaries: 'beneficiaries',
  households: 'households',
  enrollments: 'enrollments',
  services: 'service_records',
  cases: 'case_files',
  caseNotes: 'case_notes',

  indicators: 'indicators',
  indicatorResults: 'indicator_results',
  logframe: 'logframe_rows',
  evaluations: 'evaluations',
  learning: 'learning_entries',

  fieldVisits: 'field_visits',
  volunteers: 'volunteers',
  volunteerAssignments: 'volunteer_assignments',

  employees: 'employees',
  leaveRequests: 'leave_requests',
  trainings: 'training_records',

  partners: 'partners',

  accounts: 'accounts',
  funds: 'funds',
  transactions: 'transactions',
  budgetLines: 'budget_lines',
  bankAccounts: 'bank_accounts',

  purchaseRequests: 'purchase_requests',
  purchaseOrders: 'purchase_orders',
  quotations: 'quotations',

  warehouses: 'warehouses',
  inventory: 'inventory_items',
  stockMovements: 'stock_movements',
  assets: 'assets',
  vehicles: 'vehicles',
  trips: 'trips',
  maintenance: 'maintenance_records',

  compliance: 'compliance_items',
  meetings: 'board_meetings',
  resolutions: 'board_resolutions',
  policies: 'policies',

  documents: 'documents',
  auditLogs: 'audit_logs',
  notifications: 'notifications',
  calendar: 'calendar_events',

  workflows: 'workflow_definitions',
  workflowInstances: 'workflow_instances',
  featureFlags: 'feature_flags',
  dashboardLayouts: 'dashboard_layouts',

  aiConfig: 'ai_configurations',
  aiAudit: 'ai_audit_logs',
  aiMemory: 'ai_memory_entries',
  aiPrompts: 'ai_prompt_templates',

  commProviders: 'communication_providers',
  commTemplates: 'communication_templates',
  messages: 'message_logs',

  apiKeys: 'api_keys',
  webhooks: 'webhooks',
  backups: 'backup_records',
  jobRuns: 'job_runs',
} as const

export type TableKey = keyof typeof TABLES

/** Tables cleared by "Delete Demo Data", in child-before-parent order. */
export const DEMO_TABLES: string[] = [
  TABLES.caseNotes,
  TABLES.cases,
  TABLES.services,
  TABLES.enrollments,
  TABLES.beneficiaries,
  TABLES.households,
  TABLES.indicatorResults,
  TABLES.indicators,
  TABLES.logframe,
  TABLES.evaluations,
  TABLES.learning,
  TABLES.fieldVisits,
  TABLES.volunteerAssignments,
  TABLES.volunteers,
  TABLES.leaveRequests,
  TABLES.trainings,
  TABLES.employees,
  TABLES.quotations,
  TABLES.purchaseOrders,
  TABLES.purchaseRequests,
  TABLES.stockMovements,
  TABLES.inventory,
  TABLES.warehouses,
  TABLES.maintenance,
  TABLES.trips,
  TABLES.vehicles,
  TABLES.assets,
  TABLES.transactions,
  TABLES.budgetLines,
  TABLES.bankAccounts,
  TABLES.funds,
  TABLES.accounts,
  TABLES.donations,
  TABLES.campaigns,
  TABLES.grantReports,
  TABLES.grantDisbursements,
  TABLES.grants,
  TABLES.donors,
  TABLES.projectTeam,
  TABLES.projectRisks,
  TABLES.projectActivities,
  TABLES.projects,
  TABLES.programs,
  TABLES.partners,
  TABLES.resolutions,
  TABLES.meetings,
  TABLES.policies,
  TABLES.compliance,
  TABLES.documents,
  TABLES.calendar,
  TABLES.notifications,
  TABLES.workflowInstances,
  TABLES.boardMembers,
  TABLES.departments,
  TABLES.branches,
]

export interface SearchableModule {
  table: string
  module: string
  label: string
  route: string
  titleColumn: string
  subtitleColumns: string[]
  searchColumns: string[]
}

/** Drives the Universal Search engine. */
export const SEARCH_MODULES: SearchableModule[] = [
  { table: TABLES.projects, module: 'projects', label: 'Projects', route: '/app/projects', titleColumn: 'title', subtitleColumns: ['code', 'status'], searchColumns: ['title', 'code', 'location', 'sector'] },
  { table: TABLES.programs, module: 'programs', label: 'Programs', route: '/app/programs', titleColumn: 'name', subtitleColumns: ['code', 'category'], searchColumns: ['name', 'code', 'category'] },
  { table: TABLES.donors, module: 'donors', label: 'Donors', route: '/app/donors', titleColumn: 'name', subtitleColumns: ['donor_type', 'country'], searchColumns: ['name', 'code', 'contact_person', 'email'] },
  { table: TABLES.grants, module: 'grants', label: 'Grants', route: '/app/grants', titleColumn: 'title', subtitleColumns: ['code', 'stage'], searchColumns: ['title', 'code', 'focus_area'] },
  { table: TABLES.beneficiaries, module: 'beneficiaries', label: 'Beneficiaries', route: '/app/beneficiaries', titleColumn: 'full_name', subtitleColumns: ['code', 'community'], searchColumns: ['full_name', 'code', 'community', 'phone'] },
  { table: TABLES.cases, module: 'cases', label: 'Cases', route: '/app/cases', titleColumn: 'code', subtitleColumns: ['case_type', 'status'], searchColumns: ['code', 'case_type', 'summary'] },
  { table: TABLES.employees, module: 'employees', label: 'Staff', route: '/app/hr', titleColumn: 'full_name', subtitleColumns: ['position', 'staff_no'], searchColumns: ['full_name', 'staff_no', 'position', 'email'] },
  { table: TABLES.volunteers, module: 'volunteers', label: 'Volunteers', route: '/app/volunteers', titleColumn: 'full_name', subtitleColumns: ['code', 'location'], searchColumns: ['full_name', 'code', 'location', 'email'] },
  { table: TABLES.partners, module: 'partners', label: 'Partners', route: '/app/partners', titleColumn: 'name', subtitleColumns: ['partner_type', 'country'], searchColumns: ['name', 'code', 'contact_person'] },
  { table: TABLES.documents, module: 'documents', label: 'Documents', route: '/app/documents', titleColumn: 'title', subtitleColumns: ['doc_type', 'category'], searchColumns: ['title', 'doc_type', 'category'] },
  { table: TABLES.transactions, module: 'finance', label: 'Transactions', route: '/app/finance', titleColumn: 'description', subtitleColumns: ['reference', 'txn_type'], searchColumns: ['description', 'reference'] },
  { table: TABLES.assets, module: 'assets', label: 'Assets', route: '/app/assets', titleColumn: 'name', subtitleColumns: ['tag', 'category'], searchColumns: ['name', 'tag', 'serial_number'] },
  { table: TABLES.inventory, module: 'inventory', label: 'Inventory', route: '/app/inventory', titleColumn: 'name', subtitleColumns: ['sku', 'category'], searchColumns: ['name', 'sku', 'category'] },
  { table: TABLES.indicators, module: 'mel', label: 'Indicators', route: '/app/mel', titleColumn: 'name', subtitleColumns: ['code', 'level'], searchColumns: ['name', 'code'] },
  { table: TABLES.fieldVisits, module: 'field', label: 'Field Visits', route: '/app/field', titleColumn: 'location', subtitleColumns: ['code', 'visit_type'], searchColumns: ['location', 'code', 'findings'] },
  { table: TABLES.campaigns, module: 'fundraising', label: 'Campaigns', route: '/app/fundraising', titleColumn: 'name', subtitleColumns: ['code', 'channel'], searchColumns: ['name', 'code', 'channel'] },
  { table: TABLES.purchaseRequests, module: 'procurement', label: 'Procurement', route: '/app/procurement', titleColumn: 'title', subtitleColumns: ['reference', 'status'], searchColumns: ['title', 'reference'] },
  { table: TABLES.compliance, module: 'compliance', label: 'Compliance', route: '/app/compliance', titleColumn: 'title', subtitleColumns: ['category', 'status'], searchColumns: ['title', 'authority', 'reference_number'] },
]
