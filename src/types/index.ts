import type { Role } from '@/constants'

export type UUID = string
export type ISODate = string

export interface BaseRecord {
  id: UUID
  org_id: UUID
  branch_id?: UUID | null
  created_at: ISODate
  updated_at: ISODate
  deleted_at?: ISODate | null
  created_by?: UUID | null
  is_demo?: boolean
}

/* ------------------------------------------------------------------ org */

export interface Organization extends BaseRecord {
  name: string
  legal_name: string
  org_type: string
  registration_number: string | null
  tax_id: string | null
  logo_url: string | null
  primary_color: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string
  email: string | null
  phone: string | null
  website: string | null
  base_currency: string
  locale: string
  timezone: string
  date_format: string
  financial_year_start: string
  mission: string | null
  vision: string | null
  demo_mode: boolean
}

export interface Branch extends BaseRecord {
  name: string
  code: string
  branch_type: 'head_office' | 'regional_office' | 'field_office' | 'project_site'
  country: string
  state: string | null
  city: string | null
  address: string | null
  manager_id: UUID | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
}

export interface Department extends BaseRecord {
  name: string
  code: string
  head_id: UUID | null
  description: string | null
}

export interface AppUser extends BaseRecord {
  auth_user_id: UUID | null
  full_name: string
  email: string
  phone: string | null
  job_title: string | null
  role: Role
  department_id: UUID | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: ISODate | null
  mfa_enabled: boolean
}

export interface BoardMember extends BaseRecord {
  full_name: string
  position: string
  member_type: 'board' | 'trustee' | 'management' | 'advisory'
  email: string | null
  phone: string | null
  appointed_on: ISODate | null
  term_ends_on: ISODate | null
  bio: string | null
  is_active: boolean
}

/* -------------------------------------------------------- programmes */

export interface Program extends BaseRecord {
  code: string
  name: string
  category: string
  description: string | null
  goal: string | null
  manager_id: UUID | null
  start_date: ISODate | null
  end_date: ISODate | null
  budget_minor: number
  currency: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'closed'
  target_beneficiaries: number
  locations: string[] | null
}

export type ProjectStatus =
  | 'draft'
  | 'proposal'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'closed'

export interface Project extends BaseRecord {
  code: string
  title: string
  description: string | null
  program_id: UUID | null
  donor_id: UUID | null
  grant_id: UUID | null
  funding_source: string | null
  manager_id: UUID | null
  sector: string
  status: ProjectStatus
  start_date: ISODate | null
  end_date: ISODate | null
  location: string | null
  country: string
  state: string | null
  latitude: number | null
  longitude: number | null
  budget_minor: number
  spent_minor: number
  currency: string
  progress_percent: number
  target_beneficiaries: number
  reached_beneficiaries: number
  risk_level: 'low' | 'medium' | 'high'
  closure_note: string | null
}

export interface ProjectActivity extends BaseRecord {
  project_id: UUID
  title: string
  description: string | null
  activity_type: 'activity' | 'milestone' | 'deliverable'
  planned_start: ISODate | null
  planned_end: ISODate | null
  actual_end: ISODate | null
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  progress_percent: number
  responsible_id: UUID | null
  budget_minor: number
}

export interface ProjectRisk extends BaseRecord {
  project_id: UUID | null
  title: string
  category: string
  description: string | null
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string | null
  owner_id: UUID | null
  status: 'open' | 'mitigating' | 'closed'
  register_type: 'project' | 'organizational'
}

export interface ProjectTeamMember extends BaseRecord {
  project_id: UUID
  user_id: UUID
  role_on_project: string
  allocation_percent: number
}

/* -------------------------------------------------------------- donors */

export interface Donor extends BaseRecord {
  code: string
  name: string
  donor_type: string
  country: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  reporting_requirements: string | null
  preferences: string | null
  relationship_owner_id: UUID | null
  total_committed_minor: number
  total_received_minor: number
  currency: string
  status: 'prospect' | 'active' | 'dormant' | 'closed'
}

export type GrantStage =
  | 'opportunity'
  | 'research'
  | 'application'
  | 'submitted'
  | 'under_review'
  | 'awarded'
  | 'active'
  | 'reporting'
  | 'closed'

export interface Grant extends BaseRecord {
  code: string
  title: string
  donor_id: UUID | null
  program_id: UUID | null
  stage: GrantStage
  amount_requested_minor: number
  amount_awarded_minor: number
  amount_disbursed_minor: number
  amount_utilized_minor: number
  currency: string
  application_deadline: ISODate | null
  submitted_on: ISODate | null
  award_date: ISODate | null
  start_date: ISODate | null
  end_date: ISODate | null
  next_report_due: ISODate | null
  reporting_frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'final_only'
  compliance_status: 'compliant' | 'at_risk' | 'breach'
  focus_area: string | null
  requirements: string | null
  probability_percent: number
}

export interface GrantDisbursement extends BaseRecord {
  grant_id: UUID
  tranche_no: number
  amount_minor: number
  currency: string
  due_date: ISODate | null
  received_date: ISODate | null
  status: 'expected' | 'received' | 'overdue'
  reference: string | null
}

export interface GrantReport extends BaseRecord {
  grant_id: UUID
  title: string
  period_start: ISODate | null
  period_end: ISODate | null
  due_date: ISODate
  submitted_date: ISODate | null
  status: 'pending' | 'draft' | 'submitted' | 'accepted' | 'overdue'
  narrative: string | null
  prepared_by: UUID | null
}

/* --------------------------------------------------------- fundraising */

export interface Campaign extends BaseRecord {
  code: string
  name: string
  description: string | null
  channel: string
  target_minor: number
  raised_minor: number
  pledged_minor: number
  expenses_minor: number
  currency: string
  start_date: ISODate | null
  end_date: ISODate | null
  status: 'planned' | 'running' | 'paused' | 'completed'
  owner_id: UUID | null
}

export interface Donation extends BaseRecord {
  reference: string
  campaign_id: UUID | null
  donor_id: UUID | null
  donor_name: string
  donation_type: 'donation' | 'pledge'
  amount_minor: number
  currency: string
  received_on: ISODate | null
  pledge_due_on: ISODate | null
  payment_method: string
  status: 'pledged' | 'received' | 'cancelled'
  is_anonymous: boolean
  note: string | null
}

/* ------------------------------------------------------- beneficiaries */

export interface Beneficiary extends BaseRecord {
  code: string
  full_name: string
  household_id: UUID | null
  gender: 'female' | 'male' | 'other'
  date_of_birth: ISODate | null
  age: number | null
  phone: string | null
  id_type: string | null
  id_number: string | null
  country: string
  state: string | null
  lga: string | null
  community: string | null
  latitude: number | null
  longitude: number | null
  vulnerability: string[] | null
  status: 'registered' | 'enrolled' | 'active' | 'graduated' | 'exited'
  is_anonymized: boolean
  registered_on: ISODate
  notes: string | null
}

export interface Household extends BaseRecord {
  code: string
  head_name: string
  size: number
  female_count: number
  male_count: number
  children_count: number
  income_band: string | null
  community: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
}

export interface Enrollment extends BaseRecord {
  beneficiary_id: UUID
  project_id: UUID | null
  program_id: UUID | null
  enrolled_on: ISODate
  exit_on: ISODate | null
  status: 'active' | 'completed' | 'dropped'
  outcome: string | null
}

export interface ServiceRecord extends BaseRecord {
  beneficiary_id: UUID
  project_id: UUID | null
  service_type: string
  service_date: ISODate
  quantity: number
  unit: string | null
  value_minor: number
  delivered_by: UUID | null
  location: string | null
  note: string | null
}

export interface CaseFile extends BaseRecord {
  code: string
  beneficiary_id: UUID | null
  case_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'assessment' | 'intervention' | 'referred' | 'follow_up' | 'closed'
  case_worker_id: UUID | null
  opened_on: ISODate
  closed_on: ISODate | null
  summary: string | null
  outcome: string | null
}

export interface CaseNote extends BaseRecord {
  case_id: UUID
  note_type: 'assessment' | 'intervention' | 'referral' | 'follow_up' | 'note' | 'closure'
  note_date: ISODate
  content: string
  author_id: UUID | null
  referred_to: string | null
}

/* ------------------------------------------------------------ MEL */

export interface Indicator extends BaseRecord {
  code: string
  name: string
  project_id: UUID | null
  program_id: UUID | null
  level: 'input' | 'activity' | 'output' | 'outcome' | 'impact'
  unit: string
  baseline_value: number
  target_value: number
  actual_value: number
  disaggregation: string | null
  means_of_verification: string | null
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  is_active: boolean
}

export interface IndicatorResult extends BaseRecord {
  indicator_id: UUID
  period_label: string
  period_date: ISODate
  value: number
  female_value: number
  male_value: number
  location: string | null
  source: string | null
  verified: boolean
  recorded_by: UUID | null
}

export interface LogframeRow extends BaseRecord {
  project_id: UUID
  level: 'goal' | 'impact' | 'outcome' | 'output' | 'activity'
  parent_id: UUID | null
  sort_order: number
  statement: string
  indicator: string | null
  means_of_verification: string | null
  assumptions: string | null
  baseline: string | null
  target: string | null
  actual: string | null
}

export interface Evaluation extends BaseRecord {
  title: string
  project_id: UUID | null
  program_id: UUID | null
  evaluation_type: 'baseline' | 'midterm' | 'endline' | 'impact' | 'process' | 'survey'
  status: 'planned' | 'in_progress' | 'completed' | 'published'
  lead_id: UUID | null
  planned_date: ISODate | null
  completed_date: ISODate | null
  methodology: string | null
  sample_size: number
  key_findings: string | null
  recommendations: string | null
}

export interface LearningEntry extends BaseRecord {
  title: string
  entry_type: 'lesson' | 'best_practice' | 'success_story' | 'knowledge'
  project_id: UUID | null
  category: string | null
  content: string
  author_id: UUID | null
  entry_date: ISODate
  tags: string[] | null
}

/* -------------------------------------------------------- field ops */

export interface FieldVisit extends BaseRecord {
  code: string
  project_id: UUID | null
  visit_type: 'monitoring' | 'verification' | 'distribution' | 'assessment' | 'supervision'
  officer_id: UUID | null
  visit_date: ISODate
  location: string
  state: string | null
  latitude: number | null
  longitude: number | null
  participants_count: number
  female_count: number
  male_count: number
  findings: string | null
  recommendations: string | null
  status: 'planned' | 'completed' | 'submitted' | 'approved'
  photo_count: number
  synced_offline: boolean
}

export interface Volunteer extends BaseRecord {
  code: string
  full_name: string
  email: string | null
  phone: string | null
  skills: string[] | null
  availability: string | null
  location: string | null
  joined_on: ISODate
  total_hours: number
  status: 'applicant' | 'active' | 'inactive'
  rating: number
  certifications: string | null
}

export interface VolunteerAssignment extends BaseRecord {
  volunteer_id: UUID
  project_id: UUID | null
  role_title: string
  start_date: ISODate
  end_date: ISODate | null
  hours_logged: number
  status: 'assigned' | 'completed' | 'cancelled'
  performance_note: string | null
}

/* ------------------------------------------------------------- HR */

export interface Employee extends BaseRecord {
  staff_no: string
  full_name: string
  email: string | null
  phone: string | null
  gender: 'female' | 'male' | 'other'
  department_id: UUID | null
  position: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'consultant' | 'intern'
  hire_date: ISODate
  exit_date: ISODate | null
  gross_salary_minor: number
  currency: string
  project_id: UUID | null
  duty_station: string | null
  status: 'active' | 'on_leave' | 'suspended' | 'exited'
  supervisor_id: UUID | null
}

export interface LeaveRequest extends BaseRecord {
  employee_id: UUID
  leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'unpaid'
  start_date: ISODate
  end_date: ISODate
  days: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approver_id: UUID | null
}

export interface TrainingRecord extends BaseRecord {
  title: string
  audience: 'staff' | 'volunteer' | 'partner' | 'beneficiary'
  training_date: ISODate
  facilitator: string | null
  location: string | null
  participants: number
  female_participants: number
  cost_minor: number
  certification_issued: boolean
  notes: string | null
}

/* -------------------------------------------------------- partners */

export interface Partner extends BaseRecord {
  code: string
  name: string
  partner_type: 'local' | 'government' | 'implementing' | 'community' | 'consultant' | 'contractor' | 'vendor'
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  country: string
  agreement_ref: string | null
  agreement_start: ISODate | null
  agreement_end: ISODate | null
  capacity_score: number
  compliance_status: 'compliant' | 'pending_review' | 'non_compliant'
  status: 'active' | 'inactive' | 'blacklisted'
  total_paid_minor: number
}

/* --------------------------------------------------------- finance */

export interface Account extends BaseRecord {
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  parent_code: string | null
  is_restricted: boolean
  is_active: boolean
}

export interface Fund extends BaseRecord {
  code: string
  name: string
  fund_type: 'restricted' | 'unrestricted' | 'temporarily_restricted' | 'endowment'
  donor_id: UUID | null
  opening_balance_minor: number
  balance_minor: number
  currency: string
  is_active: boolean
}

export interface Transaction extends BaseRecord {
  reference: string
  txn_date: ISODate
  txn_type: 'income' | 'expense' | 'transfer' | 'adjustment' | 'reversal'
  account_code: string
  fund_id: UUID | null
  project_id: UUID | null
  grant_id: UUID | null
  donor_id: UUID | null
  partner_id: UUID | null
  description: string
  amount_minor: number
  currency: string
  exchange_rate: number
  base_amount_minor: number
  payment_method: string | null
  budget_line_id: UUID | null
  reversal_of: UUID | null
  status: 'draft' | 'posted' | 'reversed'
}

export interface BudgetLine extends BaseRecord {
  project_id: UUID | null
  grant_id: UUID | null
  category: string
  line_item: string
  account_code: string | null
  budgeted_minor: number
  spent_minor: number
  currency: string
  period: string | null
}

export interface BankAccount extends BaseRecord {
  name: string
  bank_name: string
  account_number_masked: string
  account_type: 'current' | 'savings' | 'project' | 'petty_cash'
  currency: string
  balance_minor: number
  is_active: boolean
}

/* ------------------------------------------------- procurement/assets */

export interface PurchaseRequest extends BaseRecord {
  reference: string
  title: string
  project_id: UUID | null
  requested_by: UUID | null
  request_date: ISODate
  needed_by: ISODate | null
  estimated_minor: number
  currency: string
  justification: string | null
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received' | 'closed'
  approval_instance_id: UUID | null
}

export interface PurchaseOrder extends BaseRecord {
  reference: string
  request_id: UUID | null
  partner_id: UUID | null
  order_date: ISODate
  expected_date: ISODate | null
  total_minor: number
  currency: string
  status: 'draft' | 'issued' | 'partially_received' | 'received' | 'invoiced' | 'closed' | 'cancelled'
  received_date: ISODate | null
  invoice_ref: string | null
  notes: string | null
}

export interface Quotation extends BaseRecord {
  request_id: UUID
  partner_id: UUID | null
  vendor_name: string
  quote_date: ISODate
  amount_minor: number
  currency: string
  lead_time_days: number
  technical_score: number
  selected: boolean
  remarks: string | null
}

export interface Warehouse extends BaseRecord {
  code: string
  name: string
  location: string | null
  state: string | null
  manager_id: UUID | null
  is_active: boolean
}

export interface InventoryItem extends BaseRecord {
  sku: string
  name: string
  category: string
  unit: string
  warehouse_id: UUID | null
  quantity: number
  reorder_level: number
  unit_cost_minor: number
  currency: string
  expiry_date: ISODate | null
  is_consumable: boolean
}

export interface StockMovement extends BaseRecord {
  item_id: UUID
  movement_type: 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'loss'
  quantity: number
  balance_after: number
  warehouse_id: UUID | null
  destination_warehouse_id: UUID | null
  project_id: UUID | null
  beneficiary_id: UUID | null
  movement_date: ISODate
  reference: string | null
  note: string | null
}

export interface Asset extends BaseRecord {
  tag: string
  name: string
  category: 'vehicle' | 'equipment' | 'computer' | 'medical' | 'furniture' | 'other'
  serial_number: string | null
  project_id: UUID | null
  assigned_to: UUID | null
  location: string | null
  purchase_date: ISODate | null
  purchase_cost_minor: number
  currency: string
  condition: 'new' | 'good' | 'fair' | 'poor' | 'unserviceable'
  status: 'in_use' | 'in_store' | 'maintenance' | 'disposed' | 'lost'
  next_maintenance: ISODate | null
  donor_id: UUID | null
}

export interface Vehicle extends BaseRecord {
  plate_number: string
  make: string
  model: string
  year: number | null
  vehicle_type: string
  driver_id: UUID | null
  project_id: UUID | null
  odometer_km: number
  fuel_type: string
  insurance_expiry: ISODate | null
  registration_expiry: ISODate | null
  status: 'available' | 'on_trip' | 'maintenance' | 'grounded'
  location: string | null
}

export interface Trip extends BaseRecord {
  vehicle_id: UUID
  driver_id: UUID | null
  project_id: UUID | null
  purpose: string
  start_date: ISODate
  end_date: ISODate | null
  origin: string
  destination: string
  start_km: number
  end_km: number | null
  distance_km: number
  fuel_litres: number
  fuel_cost_minor: number
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
}

export interface MaintenanceRecord extends BaseRecord {
  vehicle_id: UUID | null
  asset_id: UUID | null
  maintenance_type: 'routine' | 'repair' | 'inspection'
  service_date: ISODate
  odometer_km: number | null
  provider: string | null
  cost_minor: number
  currency: string
  description: string | null
  next_due: ISODate | null
}

/* ------------------------------------------- compliance & governance */

export interface ComplianceItem extends BaseRecord {
  title: string
  category: 'registration' | 'tax' | 'license' | 'certification' | 'donor' | 'statutory' | 'audit'
  authority: string | null
  reference_number: string | null
  issue_date: ISODate | null
  expiry_date: ISODate | null
  responsible_id: UUID | null
  status: 'valid' | 'due_soon' | 'expired' | 'in_progress'
  notes: string | null
}

export interface BoardMeeting extends BaseRecord {
  title: string
  meeting_type: 'board' | 'management' | 'agm' | 'committee'
  meeting_date: ISODate
  location: string | null
  chairperson: string | null
  attendees_count: number
  quorum_met: boolean
  agenda: string | null
  minutes: string | null
  status: 'scheduled' | 'held' | 'cancelled'
}

export interface BoardResolution extends BaseRecord {
  meeting_id: UUID | null
  reference: string
  title: string
  resolution_date: ISODate
  body: string
  proposed_by: string | null
  status: 'proposed' | 'passed' | 'rejected' | 'implemented'
}

export interface Policy extends BaseRecord {
  title: string
  category: string
  version: string
  effective_date: ISODate | null
  review_date: ISODate | null
  owner_id: UUID | null
  status: 'draft' | 'active' | 'under_review' | 'retired'
  content: string | null
}

/* ------------------------------------------------- documents & system */

export interface DocumentRecord extends BaseRecord {
  title: string
  doc_type: string
  category: string
  version: number
  file_name: string | null
  file_size: number | null
  storage_path: string | null
  content: string | null
  project_id: UUID | null
  grant_id: UUID | null
  donor_id: UUID | null
  partner_id: UUID | null
  beneficiary_id: UUID | null
  access_level: 'public' | 'internal' | 'restricted' | 'confidential'
  verification_code: string
  ai_generated: boolean
  status: 'draft' | 'final' | 'signed' | 'archived'
  author_id: UUID | null
}

export interface AuditLog {
  id: UUID
  org_id: UUID
  user_id: UUID | null
  user_name: string
  user_role: string
  action: string
  module: string
  record_id: UUID | null
  record_label: string | null
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  branch_id: UUID | null
  created_at: ISODate
}

export interface NotificationRecord extends BaseRecord {
  user_id: UUID | null
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'approval' | 'ai' | 'system'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  read: boolean
  read_at: ISODate | null
  action_url: string | null
  channels: string[]
}

export interface WorkflowDefinition extends BaseRecord {
  name: string
  module: string
  trigger_event: string
  levels: WorkflowLevel[]
  escalation_hours: number
  is_active: boolean
  threshold_minor: number | null
}

export interface WorkflowLevel {
  level: number
  label: string
  approver_role: string
  skip_below_minor?: number | null
}

export interface WorkflowInstance extends BaseRecord {
  workflow_id: UUID
  module: string
  record_id: UUID
  record_label: string
  current_level: number
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  amount_minor: number | null
  history: WorkflowHistoryEntry[]
  requested_by: UUID | null
}

export interface WorkflowHistoryEntry {
  level: number
  action: 'submitted' | 'approved' | 'rejected' | 'escalated' | 'skipped'
  actor: string
  comment?: string
  at: ISODate
}

export interface FeatureFlag extends BaseRecord {
  key: string
  name: string
  description: string
  category: 'module' | 'beta' | 'ai' | 'integration' | 'future'
  enabled: boolean
}

export interface AIConfiguration extends BaseRecord {
  provider: string
  base_url: string
  api_key_set: boolean
  default_model: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  streaming: boolean
  timeout_seconds: number
  max_retries: number
  monthly_request_limit: number
  monthly_budget_usd: number
  is_active: boolean
  module_toggles: Record<string, boolean>
  model_routing: Record<string, string>
}

export interface AIAuditLog {
  id: UUID
  org_id: UUID
  user_id: UUID | null
  user_name: string
  module: string
  action: string
  model_used: string
  provider_used: string
  prompt_tokens: number
  completion_tokens: number
  response_time_ms: number
  created_at: ISODate
}

export interface AIMemoryEntry extends BaseRecord {
  entry_type: 'terminology' | 'abbreviation' | 'faq' | 'context' | 'template' | 'workflow'
  key_text: string
  value_text: string
  module: string | null
  approved: boolean
}

export interface CommunicationTemplate extends BaseRecord {
  name: string
  channel: 'email' | 'sms' | 'whatsapp'
  subject: string | null
  body: string
  category: string
  is_active: boolean
}

export interface MessageLog extends BaseRecord {
  channel: 'email' | 'sms' | 'whatsapp'
  provider: string
  recipient: string
  subject: string | null
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  error_message: string | null
  sent_at: ISODate | null
  related_module: string | null
  related_id: UUID | null
}

export interface CommunicationProvider extends BaseRecord {
  channel: 'email' | 'sms' | 'whatsapp'
  provider: string
  display_name: string
  config: Record<string, string>
  credentials_set: boolean
  is_default: boolean
  is_active: boolean
}

export interface ApiKeyRecord extends BaseRecord {
  name: string
  key_preview: string
  scopes: string[]
  rate_limit: number
  last_used_at: ISODate | null
  expires_at: ISODate | null
  revoked: boolean
}

export interface WebhookRecord extends BaseRecord {
  name: string
  url: string
  events: string[]
  active: boolean
  last_status: number | null
  last_delivery_at: ISODate | null
  failure_count: number
}

export interface BackupRecord extends BaseRecord {
  backup_type: 'manual' | 'scheduled' | 'pre_restore'
  status: 'in_progress' | 'completed' | 'failed' | 'verified'
  size_bytes: number
  storage_path: string | null
  checksum: string | null
  notes: string | null
  expires_at: ISODate | null
}

export interface JobRun extends BaseRecord {
  job_key: string
  status: 'success' | 'failed' | 'running'
  duration_ms: number
  message: string | null
  ran_at: ISODate
}

export interface CalendarEvent extends BaseRecord {
  title: string
  event_type: 'meeting' | 'deadline' | 'field_visit' | 'training' | 'report' | 'holiday' | 'other'
  start_at: ISODate
  end_at: ISODate | null
  all_day: boolean
  location: string | null
  related_module: string | null
  related_id: UUID | null
  owner_id: UUID | null
}

export interface DashboardLayout extends BaseRecord {
  user_id: UUID | null
  role: string | null
  widgets: DashboardWidgetState[]
  is_default: boolean
}

export interface DashboardWidgetState {
  key: string
  span: 1 | 2 | 3
  hidden: boolean
}

/* ------------------------------------------------------------ helpers */

export interface SmartInsight {
  id: string
  category: 'Alert' | 'Forecast' | 'Opportunity' | 'Risk' | 'Funding' | 'Impact'
  title: string
  detail: string
}

export interface SearchHit {
  id: string
  module: string
  label: string
  sublabel: string
  href: string
}

export interface KPIStat {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  hint?: string
}
