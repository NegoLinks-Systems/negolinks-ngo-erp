import { newId } from '@/lib/repository'
import { TABLES } from '@/lib/tables'
import { buildReference, toMinor } from '@/lib/utils'
import type { DemoScenarioId } from '@/constants'

/**
 * Demo Data Manager generator.
 *
 * Produces a complete, internally consistent nonprofit: donors fund grants,
 * grants fund projects, projects sit inside programmes, beneficiaries enrol in
 * projects, indicators measure them, transactions draw down budget lines and
 * field visits verify delivery. Every reload produces different names, figures
 * and dates so demonstrations never look canned.
 */

export interface ScenarioShape {
  branches: number
  programs: number
  projects: number
  donors: number
  grants: number
  beneficiaries: number
  employees: number
  volunteers: number
  partners: number
  transactions: number
  fieldVisits: number
  campaigns: number
  label: string
}

export const SCENARIO_SHAPES: Record<DemoScenarioId, ScenarioShape> = {
  small: { branches: 2, programs: 3, projects: 6, donors: 6, grants: 8, beneficiaries: 120, employees: 12, volunteers: 14, partners: 6, transactions: 90, fieldVisits: 18, campaigns: 3, label: 'Small Organization' },
  medium: { branches: 4, programs: 5, projects: 14, donors: 14, grants: 20, beneficiaries: 420, employees: 34, volunteers: 40, partners: 16, transactions: 260, fieldVisits: 48, campaigns: 6, label: 'Medium Organization' },
  large: { branches: 7, programs: 8, projects: 26, donors: 26, grants: 38, beneficiaries: 1100, employees: 78, volunteers: 96, partners: 34, transactions: 620, fieldVisits: 120, campaigns: 10, label: 'Large Enterprise' },
  multi_branch: { branches: 9, programs: 7, projects: 22, donors: 20, grants: 30, beneficiaries: 860, employees: 64, volunteers: 80, partners: 28, transactions: 480, fieldVisits: 150, campaigns: 8, label: 'Multi-Branch Enterprise' },
  heavy: { branches: 6, programs: 8, projects: 30, donors: 30, grants: 44, beneficiaries: 1500, employees: 92, volunteers: 110, partners: 40, transactions: 1400, fieldVisits: 220, campaigns: 12, label: 'Enterprise with Heavy Daily Transactions' },
}

/* ------------------------------------------------------------ dictionaries */

const DEMO_ORG_NAMES = [
  'Nego Hope Foundation',
  'Nego Community Development Initiative',
  'Nego Humanitarian Trust',
  'Nego Impact Foundation',
  'Nego Development Alliance',
]

const SECTORS = ['Education', 'Health', 'Livelihoods', 'WASH', 'Protection', 'Food Security', 'Nutrition', 'Climate & Environment', 'Gender Equality', 'Youth Empowerment']

const PROGRAM_NAMES = [
  ['Girls Education Advancement', 'Education'],
  ['Primary Healthcare Strengthening', 'Health'],
  ['Rural Livelihoods & Enterprise', 'Livelihoods'],
  ['Safe Water & Sanitation', 'WASH'],
  ['Child Protection & Family Support', 'Protection'],
  ['Climate Resilient Agriculture', 'Climate & Environment'],
  ['Youth Skills & Employment', 'Youth Empowerment'],
  ['Women Economic Empowerment', 'Gender Equality'],
]

const PROJECT_TITLES = [
  'Back-to-School Support for Out-of-School Girls',
  'Community Health Worker Deployment',
  'Cash-for-Work Livelihood Recovery',
  'Borehole Rehabilitation and Hygiene Promotion',
  'Child Protection Case Management Scale-Up',
  'Climate-Smart Farming Inputs Distribution',
  'Vocational Skills Training for Young Women',
  'Village Savings and Loan Associations',
  'Emergency Nutrition Response',
  'Teacher Capacity Development Programme',
  'Maternal and Newborn Health Outreach',
  'Solar-Powered Water Scheme',
  'Gender-Based Violence Prevention Campaign',
  'School Feeding and Retention Initiative',
  'Digital Literacy for Rural Youth',
  'Livestock Restocking for Displaced Households',
  'Community Peacebuilding Dialogues',
  'Adolescent Sexual and Reproductive Health',
  'Disability Inclusive Education Pilot',
  'Post-Flood Shelter and NFI Distribution',
  'Malaria Prevention Net Campaign',
  'Smallholder Market Linkage Programme',
  'Early Childhood Development Centres',
  'Youth Civic Participation Initiative',
  'Nutrition Surveillance and Screening',
  'Sustainable Cookstove Distribution',
  'Girls Mentorship and Life Skills',
  'Rural Health Facility Equipping',
  'Agroforestry and Land Restoration',
  'Emergency Cash Transfer Response',
]

const DONOR_POOL: [string, string, string][] = [
  ['Global Development Fund', 'International Development Agency', 'United Kingdom'],
  ['Northbridge Foundation', 'Foundation', 'United States'],
  ['European Solidarity Agency', 'Government', 'Belgium'],
  ['Sahel Humanitarian Pool Fund', 'International Development Agency', 'Senegal'],
  ['Ashford Family Trust', 'Philanthropic Organization', 'United States'],
  ['Continental Bank Foundation', 'Corporate', 'Nigeria'],
  ['Nordic Development Cooperation', 'Government', 'Norway'],
  ['Riverstone Charitable Trust', 'Foundation', 'Canada'],
  ['Federal Ministry of Humanitarian Affairs', 'Government', 'Nigeria'],
  ['TeleAfrica Corporate Responsibility', 'Corporate', 'Nigeria'],
  ['Highfield Philanthropies', 'Philanthropic Organization', 'United Kingdom'],
  ['West Africa Resilience Facility', 'International Development Agency', 'Ghana'],
  ['Mercator Global Health Fund', 'Foundation', 'Switzerland'],
  ['State Government Partnership Grant', 'Government', 'Nigeria'],
  ['Amara Adeyemi', 'Individual', 'Nigeria'],
  ['Coastline Energy Foundation', 'Corporate', 'Nigeria'],
  ['Pan-African Education Trust', 'Foundation', 'Kenya'],
  ['United Community Givers Circle', 'Individual', 'Nigeria'],
  ['Blue Meridian Impact Fund', 'Foundation', 'United States'],
  ['Commonwealth Development Office', 'Government', 'United Kingdom'],
  ['Sunrise Women Fund', 'Philanthropic Organization', 'Kenya'],
  ['Delta Basin Development Commission', 'Government', 'Nigeria'],
  ['Hartwell Group CSR', 'Corporate', 'South Africa'],
  ['Global Child Relief', 'Institutional', 'United States'],
  ['Atlas Humanitarian Alliance', 'Institutional', 'France'],
  ['Green Horizon Climate Fund', 'Foundation', 'Netherlands'],
  ['Ubuntu Giving Collective', 'Philanthropic Organization', 'South Africa'],
  ['Lakeshore Foundation', 'Foundation', 'Kenya'],
  ['Anonymous Major Donor', 'Individual', 'Nigeria'],
  ['Regional Health Financing Facility', 'International Development Agency', 'Ethiopia'],
]

const STATES: [string, string, number, number][] = [
  ['Plateau', 'Jos North', 9.8965, 8.8583],
  ['Kaduna', 'Chikun', 10.5105, 7.4165],
  ['Benue', 'Makurdi', 7.7322, 8.5391],
  ['Borno', 'Maiduguri', 11.8311, 13.1510],
  ['Lagos', 'Ikorodu', 6.6194, 3.5106],
  ['Kano', 'Dala', 12.0022, 8.5167],
  ['Cross River', 'Calabar Municipality', 4.9757, 8.3417],
  ['Sokoto', 'Wamakko', 13.0059, 5.2476],
  ['Enugu', 'Nsukka', 6.8567, 7.3958],
  ['Adamawa', 'Yola North', 9.2035, 12.4954],
  ['Niger', 'Bosso', 9.6139, 6.5569],
  ['Oyo', 'Ibadan North', 7.4106, 3.9167],
]

const COMMUNITIES = ['Angwan Rukuba', 'Gyel', 'Dadin Kowa', 'Zawan', 'Rafin Sanyi', 'Tudun Wada', 'Bukuru', 'Kabong', 'Sabon Gari', 'Mangu Halle', 'Kuru Jenta', 'Foron', 'Riyom Central', 'Barkin Ladi', 'Vom', 'Heipang']

const FIRST_NAMES = ['Amina', 'Chidi', 'Ngozi', 'Ibrahim', 'Fatima', 'Emeka', 'Blessing', 'Yusuf', 'Grace', 'Musa', 'Halima', 'Peter', 'Rejoice', 'Suleiman', 'Esther', 'Daniel', 'Zainab', 'Joseph', 'Mercy', 'Abubakar', 'Comfort', 'Samuel', 'Aisha', 'John', 'Patience', 'Nasiru', 'Deborah', 'Solomon', 'Hauwa', 'Michael', 'Rahmatu', 'Victor', 'Lydia', 'Umar', 'Joy', 'Bala', 'Naomi', 'Gideon', 'Saratu', 'Emmanuel']

const LAST_NAMES = ['Okafor', 'Bello', 'Adeyemi', 'Danjuma', 'Musa', 'Eze', 'Ibrahim', 'Yakubu', 'Nwosu', 'Suleiman', 'Adamu', 'Obi', 'Garba', 'Chukwu', 'Lawal', 'Ojo', 'Abubakar', 'Pam', 'Dung', 'Gyang', 'Longwap', 'Bitrus', 'Mohammed', 'Audu', 'Solomon', 'Damina', 'Choji', 'Yohanna']

const POSITIONS = ['Executive Director', 'Programme Manager', 'Project Officer', 'Finance Manager', 'Finance Officer', 'MEL Officer', 'MEL Manager', 'Field Officer', 'Community Mobiliser', 'Case Worker', 'HR Manager', 'Procurement Officer', 'Logistics Officer', 'Communications Officer', 'Grants Manager', 'Donor Relations Officer', 'Programme Assistant', 'Driver', 'Nutrition Officer', 'Protection Officer']

const PARTNER_NAMES = ['Plateau Rural Development Association', 'Community Voice Initiative', 'State Ministry of Education', 'Grassroots Women Network', 'Highland Medical Supplies Ltd', 'Northern Youth Development Trust', 'Riverline Consulting', 'Local Government Health Authority', 'Unity Community Trust', 'Bridgepoint Logistics Ltd', 'Rural Empowerment Society', 'Standard Office Supplies Ltd', 'Hilltop Construction Services', 'Community Health Volunteers Network', 'Sunrise Training Institute', 'Farmers Cooperative Union', 'Digital Access Foundation', 'Clean Water Engineers Ltd', 'Faith Development Council', 'Green Field Agro Services', 'Legal Aid Collective', 'Safe Haven Shelter Network', 'Metro Print & Media', 'Skyway Travel Services', 'Precision Audit Partners', 'Vanguard Security Services', 'Community Radio Network', 'Peak Vehicle Services', 'Northline Warehousing', 'Clearpath Consultants', 'Hope Rehabilitation Centre', 'Agro Input Distributors Ltd', 'Village Bank Cooperative', 'Sunbeam Educational Services', 'Frontier Health Partners', 'Terra Environmental Services', 'Insight Research Group', 'Guardian Child Rights Network', 'Prime Fuel Services', 'Summit ICT Solutions']

const EXPENSE_CATEGORIES = ['Programme Activities', 'Staff Costs', 'Travel & Transport', 'Training & Workshops', 'Supplies & Materials', 'Beneficiary Assistance', 'Office & Administration', 'Monitoring & Evaluation', 'Communications', 'Equipment', 'Consultancy', 'Vehicle Running Costs']

const INDICATOR_TEMPLATES: [string, string, 'output' | 'outcome' | 'impact' | 'activity'][] = [
  ['Number of children enrolled in school', 'children', 'output'],
  ['Number of households reached with cash assistance', 'households', 'output'],
  ['Number of health workers trained', 'persons', 'output'],
  ['Number of water points rehabilitated', 'water points', 'output'],
  ['Percentage of learners completing the school year', '%', 'outcome'],
  ['Percentage of households with improved food consumption score', '%', 'outcome'],
  ['Percentage increase in average household income', '%', 'outcome'],
  ['Number of protection cases successfully resolved', 'cases', 'outcome'],
  ['Reduction in acute malnutrition prevalence', '%', 'impact'],
  ['Number of community awareness sessions conducted', 'sessions', 'activity'],
  ['Number of women accessing savings groups', 'women', 'output'],
  ['Percentage of beneficiaries reporting improved wellbeing', '%', 'impact'],
]

const VULNERABILITIES = ['Internally Displaced', 'Refugee', 'Orphan / Vulnerable Child', 'Person With Disability', 'Female-Headed Household', 'Elderly', 'Chronically Ill', 'Out-of-School Child', 'Survivor of Violence', 'Low Income']

const CASE_TYPES = ['Child Protection', 'Gender-Based Violence', 'Family Reunification', 'Psychosocial Support', 'Legal Assistance', 'Medical Referral', 'Education Reintegration', 'Livelihood Support']

const ITEM_POOL: [string, string, string][] = [
  ['School Bag', 'Education Supplies', 'piece'],
  ['Exercise Book (40 leaves)', 'Education Supplies', 'piece'],
  ['Mosquito Net (LLIN)', 'Health Supplies', 'piece'],
  ['Ready-to-Use Therapeutic Food', 'Nutrition', 'carton'],
  ['Hygiene Kit', 'WASH', 'kit'],
  ['Jerry Can 20L', 'WASH', 'piece'],
  ['Maize Seed', 'Agriculture Inputs', 'kg'],
  ['NPK Fertiliser', 'Agriculture Inputs', 'bag'],
  ['Tarpaulin Sheet', 'Shelter/NFI', 'piece'],
  ['Blanket', 'Shelter/NFI', 'piece'],
  ['Solar Lamp', 'Energy', 'piece'],
  ['Sanitary Pads Pack', 'WASH', 'pack'],
  ['First Aid Kit', 'Health Supplies', 'kit'],
  ['Laptop Computer', 'ICT Equipment', 'piece'],
  ['Printer Cartridge', 'Office Supplies', 'piece'],
]

/* ---------------------------------------------------------------- helpers */

let seed = Date.now() % 2147483647

const rand = (): number => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

export const reseedDemo = (): void => {
  seed = (Date.now() + Math.floor(Math.random() * 100000)) % 2147483647
  if (seed <= 0) seed = 1
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T
const pickMany = <T,>(items: readonly T[], count: number): T[] => {
  const pool = [...items]
  const out: T[] = []
  for (let i = 0; i < count && pool.length; i += 1) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0] as T)
  }
  return out
}
const int = (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min
const chance = (probability: number): boolean => rand() < probability
const person = (): string => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString()
const dateOnly = (iso: string): string => iso.slice(0, 10)
const inDays = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString()
const phone = (): string => `+2348${int(10, 99)}${int(1000000, 9999999)}`
const emailFor = (name: string, domain: string): string =>
  `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${domain}`

export interface DemoBundle {
  orgPatch: Record<string, unknown>
  tables: { table: string; rows: Record<string, unknown>[] }[]
  summary: { label: string; count: number }[]
}

/* ------------------------------------------------------------- generator */

export const generateDemoData = (orgId: string, scenario: DemoScenarioId): DemoBundle => {
  reseedDemo()
  const shape = SCENARIO_SHAPES[scenario]
  const base = { org_id: orgId, is_demo: true, deleted_at: null }
  const stamp = (createdDaysAgo = 0) => ({
    created_at: daysAgo(createdDaysAgo),
    updated_at: daysAgo(Math.max(0, createdDaysAgo - 1)),
  })
  const orgName = pick(DEMO_ORG_NAMES)
  const domain = `${orgName.toLowerCase().replace(/[^a-z]+/g, '')}.org`

  /* ---------------------------------------------------------- structure */

  const branchNames = ['Head Office', 'Northern Regional Office', 'Central Field Office', 'Eastern Field Office', 'Southern Field Office', 'Western Field Office', 'Emergency Response Hub', 'Highlands Sub-Office', 'Riverine Sub-Office']
  const branches = Array.from({ length: shape.branches }, (_, index) => {
    const location = STATES[index % STATES.length] as [string, string, number, number]
    return {
      ...base,
      ...stamp(400 - index * 10),
      id: newId(),
      name: branchNames[index] ?? `Field Office ${index + 1}`,
      code: `BR-${String(index + 1).padStart(2, '0')}`,
      branch_type: index === 0 ? 'head_office' : index < 3 ? 'regional_office' : 'field_office',
      country: 'Nigeria',
      state: location[0],
      city: location[1],
      address: `${int(1, 90)} ${pick(['Independence', 'Ahmadu Bello', 'Murtala', 'Rukuba', 'Yakubu Gowon'])} Road`,
      manager_id: null,
      latitude: location[2] + (rand() - 0.5) * 0.3,
      longitude: location[3] + (rand() - 0.5) * 0.3,
      is_active: true,
    }
  })

  const departmentNames = ['Programmes', 'Finance & Administration', 'Monitoring, Evaluation & Learning', 'Human Resources', 'Procurement & Logistics', 'Partnerships & Fundraising', 'Field Operations']
  const departments = departmentNames.map((name, index) => ({
    ...base,
    ...stamp(390 - index),
    id: newId(),
    name,
    code: name.split(' ')[0]?.slice(0, 4).toUpperCase() ?? `DEP${index}`,
    head_id: null,
    description: `${name} function of ${orgName}.`,
  }))

  const boardMembers = Array.from({ length: 8 }, (_, index) => ({
    ...base,
    ...stamp(500 - index * 12),
    id: newId(),
    full_name: person(),
    position: ['Board Chairperson', 'Vice Chairperson', 'Honorary Secretary', 'Treasurer', 'Trustee', 'Trustee', 'Executive Director', 'Independent Director'][index] as string,
    member_type: index < 4 ? 'board' : index < 6 ? 'trustee' : index === 6 ? 'management' : 'advisory',
    email: null,
    phone: phone(),
    appointed_on: dateOnly(daysAgo(int(400, 1400))),
    term_ends_on: dateOnly(inDays(int(120, 900))),
    bio: `Serves on the governing board of ${orgName} with responsibility for ${pick(['strategy', 'finance oversight', 'programme quality', 'governance', 'risk and audit'])}.`,
    is_active: true,
  }))

  /* ------------------------------------------------------------- people */

  const employees = Array.from({ length: shape.employees }, (_, index) => {
    const gender = chance(0.52) ? 'female' : 'male'
    const name = person()
    const position = index === 0 ? 'Executive Director' : pick(POSITIONS)
    const hire = int(60, 1800)
    return {
      ...base,
      ...stamp(hire),
      id: newId(),
      staff_no: `STF-${String(index + 1).padStart(4, '0')}`,
      full_name: name,
      email: emailFor(name, domain),
      phone: phone(),
      gender,
      department_id: pick(departments).id,
      position,
      employment_type: chance(0.75) ? 'full_time' : pick(['contract', 'part_time', 'consultant', 'intern']),
      hire_date: dateOnly(daysAgo(hire)),
      exit_date: null,
      gross_salary_minor: toMinor(int(180, 1400) * 1000),
      currency: 'NGN',
      project_id: null,
      duty_station: pick(branches).name,
      status: chance(0.93) ? 'active' : pick(['on_leave', 'suspended']),
      supervisor_id: null,
      branch_id: pick(branches).id,
    }
  })

  const volunteers = Array.from({ length: shape.volunteers }, (_, index) => {
    const name = person()
    return {
      ...base,
      ...stamp(int(20, 800)),
      id: newId(),
      code: `VOL-${String(index + 1).padStart(4, '0')}`,
      full_name: name,
      email: emailFor(name, 'volunteer.org'),
      phone: phone(),
      skills: pickMany(['Community Mobilisation', 'Data Collection', 'Health Education', 'Teaching', 'Translation', 'Logistics', 'First Aid', 'Counselling', 'Photography', 'Facilitation'], int(2, 4)),
      availability: pick(['Weekends', 'Weekdays', 'Full-time', 'On-call', 'Evenings']),
      location: pick(COMMUNITIES),
      joined_on: dateOnly(daysAgo(int(30, 700))),
      total_hours: int(12, 480),
      status: chance(0.82) ? 'active' : pick(['applicant', 'inactive']),
      rating: Number((3 + rand() * 2).toFixed(1)),
      certifications: chance(0.4) ? pick(['Basic First Aid', 'Child Safeguarding', 'Data Protection', 'Community Facilitation']) : null,
    }
  })

  /* ------------------------------------------------------------- donors */

  const donorPool = pickMany(DONOR_POOL, Math.min(shape.donors, DONOR_POOL.length))
  const donors = donorPool.map((entry, index) => {
    const committed = toMinor(int(15, 900) * 1_000_000)
    const received = Math.round(committed * (0.35 + rand() * 0.6))
    return {
      ...base,
      ...stamp(int(120, 1200)),
      id: newId(),
      code: `DNR-${String(index + 1).padStart(3, '0')}`,
      name: entry[0],
      donor_type: entry[1],
      country: entry[2],
      contact_person: person(),
      email: emailFor(entry[0].slice(0, 14), 'donor.org'),
      phone: phone(),
      address: `${int(1, 200)} ${pick(['Grosvenor', 'Rue de la Loi', 'Massachusetts', 'Broad', 'Kingsway'])} Street`,
      website: `https://www.${entry[0].toLowerCase().replace(/[^a-z]+/g, '')}.org`,
      reporting_requirements: pick(['Quarterly narrative and financial reports', 'Semi-annual narrative report with annexes', 'Monthly activity update and annual audited statement', 'Annual report plus final evaluation']),
      preferences: pick(['Prefers direct implementation with local partners', 'Focus on gender-responsive programming', 'Requires beneficiary-level disaggregated data', 'Prioritises climate-resilient interventions']),
      relationship_owner_id: pick(employees).id,
      total_committed_minor: committed,
      total_received_minor: received,
      currency: chance(0.45) ? 'USD' : 'NGN',
      status: chance(0.75) ? 'active' : pick(['prospect', 'dormant']),
    }
  })

  /* ----------------------------------------------------------- programs */

  const programs = pickMany(PROGRAM_NAMES, Math.min(shape.programs, PROGRAM_NAMES.length)).map(
    (entry, index) => ({
      ...base,
      ...stamp(int(200, 900)),
      id: newId(),
      code: `PRG-${String(index + 1).padStart(3, '0')}`,
      name: entry[0] as string,
      category: entry[1] as string,
      description: `Multi-year programme delivering ${(entry[1] as string).toLowerCase()} outcomes across target communities.`,
      goal: `Improved ${(entry[1] as string).toLowerCase()} outcomes for vulnerable households in target locations.`,
      manager_id: pick(employees).id,
      start_date: dateOnly(daysAgo(int(300, 900))),
      end_date: dateOnly(inDays(int(120, 900))),
      budget_minor: toMinor(int(60, 800) * 1_000_000),
      currency: 'NGN',
      status: chance(0.8) ? 'active' : pick(['planning', 'on_hold', 'completed']),
      target_beneficiaries: int(2000, 40000),
      locations: pickMany(STATES.map((s) => s[0]), int(2, 5)),
    }),
  )

  /* ------------------------------------------------------------ grants */

  const grantStages = ['opportunity', 'research', 'application', 'submitted', 'under_review', 'awarded', 'active', 'reporting', 'closed'] as const
  const stageWeights = [0.06, 0.05, 0.07, 0.08, 0.08, 0.09, 0.35, 0.14, 0.08]

  const pickStage = (): string => {
    const roll = rand()
    let cumulative = 0
    for (let i = 0; i < grantStages.length; i += 1) {
      cumulative += stageWeights[i] as number
      if (roll <= cumulative) return grantStages[i] as string
    }
    return 'active'
  }

  const grants = Array.from({ length: shape.grants }, (_, index) => {
    const stage = pickStage()
    const donor = pick(donors)
    const requested = toMinor(int(8, 420) * 1_000_000)
    const awarded = ['awarded', 'active', 'reporting', 'closed'].includes(stage)
      ? Math.round(requested * (0.6 + rand() * 0.45))
      : 0
    const disbursed = awarded ? Math.round(awarded * (0.4 + rand() * 0.6)) : 0
    const utilized = disbursed ? Math.round(disbursed * (0.35 + rand() * 0.6)) : 0
    const start = int(30, 700)
    return {
      ...base,
      ...stamp(start + 30),
      id: newId(),
      code: buildReference('GRT', index + 1),
      title: `${pick(SECTORS)} ${pick(['Support', 'Response', 'Strengthening', 'Resilience', 'Scale-Up'])} Grant — ${donor.name}`,
      donor_id: donor.id,
      program_id: pick(programs).id,
      stage,
      amount_requested_minor: requested,
      amount_awarded_minor: awarded,
      amount_disbursed_minor: disbursed,
      amount_utilized_minor: utilized,
      currency: donor.currency,
      application_deadline: ['opportunity', 'research', 'application'].includes(stage)
        ? dateOnly(inDays(int(5, 120)))
        : dateOnly(daysAgo(int(30, 400))),
      submitted_on: ['submitted', 'under_review', 'awarded', 'active', 'reporting', 'closed'].includes(stage)
        ? dateOnly(daysAgo(int(40, 500)))
        : null,
      award_date: awarded ? dateOnly(daysAgo(int(20, 400))) : null,
      start_date: awarded ? dateOnly(daysAgo(start)) : null,
      end_date: awarded ? dateOnly(inDays(int(-60, 500))) : null,
      next_report_due: ['active', 'reporting'].includes(stage) ? dateOnly(inDays(int(-20, 120))) : null,
      reporting_frequency: pick(['monthly', 'quarterly', 'biannual', 'annual', 'final_only']),
      compliance_status: chance(0.82) ? 'compliant' : chance(0.7) ? 'at_risk' : 'breach',
      focus_area: pick(SECTORS),
      requirements: pick(['Quarterly financial and narrative reporting; annual external audit.', 'Beneficiary-level disaggregated data; no-cost extension requires prior approval.', 'Semi-annual reporting; procurement above threshold requires three quotations.', 'Monthly burn-rate updates; final evaluation mandatory.']),
      probability_percent: ['awarded', 'active', 'reporting', 'closed'].includes(stage) ? 100 : int(20, 85),
    }
  })

  const activeGrants = grants.filter((grant) => ['awarded', 'active', 'reporting', 'closed'].includes(grant.stage))

  const grantDisbursements = activeGrants.flatMap((grant) => {
    const tranches = int(2, 4)
    return Array.from({ length: tranches }, (_, index) => {
      const received = index < tranches - 1 || chance(0.5)
      return {
        ...base,
        ...stamp(int(20, 300)),
        id: newId(),
        grant_id: grant.id,
        tranche_no: index + 1,
        amount_minor: Math.round(grant.amount_awarded_minor / tranches),
        currency: grant.currency,
        due_date: dateOnly(daysAgo(300 - index * 90)),
        received_date: received ? dateOnly(daysAgo(290 - index * 90)) : null,
        status: received ? 'received' : chance(0.5) ? 'overdue' : 'expected',
        reference: `TRN/${grant.code.replace(/\//g, '-')}/${index + 1}`,
      }
    })
  })

  const grantReports = activeGrants.flatMap((grant) => {
    const count = int(1, 3)
    return Array.from({ length: count }, (_, index) => {
      const due = int(-40, 150)
      const submitted = due > 20 ? false : chance(0.72)
      return {
        ...base,
        ...stamp(int(10, 200)),
        id: newId(),
        grant_id: grant.id,
        title: `${pick(['Quarterly', 'Semi-Annual', 'Annual', 'Interim'])} Report — ${grant.code}`,
        period_start: dateOnly(daysAgo(180 + index * 90)),
        period_end: dateOnly(daysAgo(90 + index * 90)),
        due_date: dateOnly(inDays(due)),
        submitted_date: submitted ? dateOnly(daysAgo(int(1, 60))) : null,
        status: submitted ? pick(['submitted', 'accepted']) : due < 0 ? 'overdue' : pick(['pending', 'draft']),
        narrative: submitted
          ? `Reporting period activities were delivered against agreed targets. Beneficiary reach stood at ${int(65, 118)}% of plan, with variances explained by seasonal access constraints.`
          : null,
        prepared_by: pick(employees).id,
      }
    })
  })

  /* ---------------------------------------------------------- projects */

  const projectStatusPool = ['active', 'active', 'active', 'active', 'completed', 'approved', 'proposal', 'pending_approval', 'suspended', 'closed', 'draft']

  const projects = Array.from({ length: shape.projects }, (_, index) => {
    const location = pick(STATES)
    const program = pick(programs)
    const grant = chance(0.75) ? pick(activeGrants.length ? activeGrants : grants) : null
    const donor = grant ? donors.find((d) => d.id === grant.donor_id) ?? pick(donors) : pick(donors)
    const budget = toMinor(int(5, 260) * 1_000_000)
    const status = pick(projectStatusPool)
    const progress = status === 'completed' || status === 'closed' ? 100 : status === 'active' ? int(15, 95) : status === 'suspended' ? int(20, 60) : int(0, 15)
    const spent = Math.round(budget * (progress / 100) * (0.72 + rand() * 0.45))
    const target = int(400, 12000)
    return {
      ...base,
      ...stamp(int(30, 800)),
      id: newId(),
      code: buildReference('PRJ', index + 1),
      title: PROJECT_TITLES[index % PROJECT_TITLES.length] as string,
      description: `Implemented in ${location[1]}, ${location[0]} State under the ${program.name} programme, targeting vulnerable households with ${pick(SECTORS).toLowerCase()} interventions.`,
      program_id: program.id,
      donor_id: donor.id,
      grant_id: grant?.id ?? null,
      funding_source: donor.name,
      manager_id: pick(employees).id,
      sector: program.category,
      status,
      start_date: dateOnly(daysAgo(int(60, 720))),
      end_date: dateOnly(inDays(int(-120, 540))),
      location: `${location[1]}, ${location[0]}`,
      country: 'Nigeria',
      state: location[0],
      latitude: location[2] + (rand() - 0.5) * 0.4,
      longitude: location[3] + (rand() - 0.5) * 0.4,
      budget_minor: budget,
      spent_minor: Math.min(spent, Math.round(budget * 1.08)),
      currency: 'NGN',
      progress_percent: progress,
      target_beneficiaries: target,
      reached_beneficiaries: Math.round(target * (progress / 100) * (0.7 + rand() * 0.5)),
      risk_level: chance(0.6) ? 'low' : chance(0.65) ? 'medium' : 'high',
      closure_note: status === 'closed' ? 'Project closed following final donor report acceptance and asset handover.' : null,
      branch_id: pick(branches).id,
    }
  })

  const activeProjects = projects.filter((project) => ['active', 'approved', 'completed'].includes(project.status))
  const projectFor = () => (activeProjects.length ? pick(activeProjects) : pick(projects))

  const projectActivities = projects.flatMap((project) =>
    Array.from({ length: int(3, 7) }, (_, index) => {
      const type = index === 0 ? 'milestone' : chance(0.25) ? 'deliverable' : 'activity'
      const done = project.progress_percent > (index + 1) * 14
      return {
        ...base,
        ...stamp(int(10, 300)),
        id: newId(),
        project_id: project.id,
        title: `${pick(['Community entry and sensitisation', 'Beneficiary identification and verification', 'Procurement of programme inputs', 'Distribution exercise', 'Training of facilitators', 'Post-distribution monitoring', 'Stakeholder review meeting', 'Baseline assessment', 'Endline survey', 'Handover and closeout'])}`,
        description: null,
        activity_type: type,
        planned_start: dateOnly(daysAgo(200 - index * 25)),
        planned_end: dateOnly(daysAgo(170 - index * 25)),
        actual_end: done ? dateOnly(daysAgo(165 - index * 25)) : null,
        status: done ? 'completed' : chance(0.5) ? 'in_progress' : chance(0.6) ? 'planned' : 'delayed',
        progress_percent: done ? 100 : int(0, 80),
        responsible_id: pick(employees).id,
        budget_minor: Math.round(project.budget_minor / int(6, 12)),
      }
    }),
  )

  const projectRisks = projects.slice(0, Math.ceil(projects.length * 0.7)).map((project) => ({
    ...base,
    ...stamp(int(10, 200)),
    id: newId(),
    project_id: project.id,
    title: pick(['Insecurity restricting field access', 'Delayed donor disbursement', 'Exchange rate volatility eroding budget', 'Seasonal flooding affecting delivery', 'Community resistance to targeting criteria', 'Supplier price escalation', 'Staff turnover in field team', 'Weak partner reporting capacity']),
    category: pick(['Security', 'Financial', 'Operational', 'Environmental', 'Reputational', 'Compliance']),
    description: null,
    likelihood: pick(['low', 'medium', 'high']),
    impact: pick(['low', 'medium', 'high']),
    mitigation: pick(['Security assessments before each field movement; alternate routes identified.', 'Bridge financing from unrestricted reserves; escalated to donor focal point.', 'Budget revision submitted; procurement frontloaded.', 'Activities rescheduled outside peak rainy season.', 'Community entry meetings with traditional leadership.']),
    owner_id: pick(employees).id,
    status: chance(0.6) ? 'mitigating' : chance(0.6) ? 'open' : 'closed',
    register_type: 'project',
  }))

  const organizationalRisks = Array.from({ length: 6 }, () => ({
    ...base,
    ...stamp(int(20, 400)),
    id: newId(),
    project_id: null,
    title: pick(['Over-reliance on a single institutional donor', 'Cyber security of beneficiary data', 'Statutory filing deadlines missed', 'Fraud in cash-based programming', 'Safeguarding incident exposure', 'Loss of key technical staff']),
    category: pick(['Strategic', 'Compliance', 'Financial', 'Reputational', 'Operational']),
    description: null,
    likelihood: pick(['low', 'medium', 'high']),
    impact: pick(['medium', 'high']),
    mitigation: pick(['Donor diversification strategy approved by the board.', 'Role-based access controls and annual data protection training.', 'Compliance calendar with automated reminders.', 'Segregation of duties and independent post-distribution verification.']),
    owner_id: pick(employees).id,
    status: pick(['open', 'mitigating']),
    register_type: 'organizational',
  }))

  const projectTeam = projects.flatMap((project) =>
    pickMany(employees, int(3, 6)).map((employee) => ({
      ...base,
      ...stamp(int(10, 300)),
      id: newId(),
      project_id: project.id,
      user_id: employee.id,
      role_on_project: pick(['Project Manager', 'Field Officer', 'MEL Focal Point', 'Finance Focal Point', 'Community Mobiliser', 'Logistics Support']),
      allocation_percent: int(20, 100),
    })),
  )

  /* ------------------------------------------------------- fundraising */

  const campaigns = Array.from({ length: shape.campaigns }, (_, index) => {
    const target = toMinor(int(3, 90) * 1_000_000)
    const raised = Math.round(target * (0.15 + rand() * 1.05))
    return {
      ...base,
      ...stamp(int(20, 500)),
      id: newId(),
      code: `CMP-${String(index + 1).padStart(3, '0')}`,
      name: pick(['Back to School Appeal', 'Ramadan Food Drive', 'Christmas Giving Campaign', 'Clean Water for All', 'Emergency Flood Response Appeal', 'Girls Education Fund', 'Health for Mothers Campaign', 'Season of Hope', 'End Malnutrition Now', 'Youth Futures Fund', 'Winter Warmth Appeal', 'Community Rebuild Fund']),
      description: 'Public fundraising appeal supporting programme delivery in priority communities.',
      channel: pick(['Online', 'Corporate Partnership', 'Community Events', 'Faith Networks', 'Direct Mail', 'Major Donor', 'SMS Giving']),
      target_minor: target,
      raised_minor: raised,
      pledged_minor: Math.round(target * rand() * 0.35),
      expenses_minor: Math.round(raised * (0.04 + rand() * 0.12)),
      currency: 'NGN',
      start_date: dateOnly(daysAgo(int(30, 400))),
      end_date: dateOnly(inDays(int(-60, 200))),
      status: chance(0.5) ? 'running' : pick(['planned', 'completed', 'paused']),
      owner_id: pick(employees).id,
    }
  })

  const donationCount = Math.round(shape.beneficiaries * 0.35)
  const donations = Array.from({ length: donationCount }, (_, index) => {
    const isPledge = chance(0.22)
    const campaign = pick(campaigns)
    const institutional = chance(0.3)
    const donor = institutional ? pick(donors) : null
    const anonymous = !institutional && chance(0.12)
    return {
      ...base,
      ...stamp(int(1, 400)),
      id: newId(),
      reference: buildReference('DON', index + 1),
      campaign_id: campaign.id,
      donor_id: donor?.id ?? null,
      donor_name: anonymous ? 'Anonymous Donor' : donor?.name ?? person(),
      donation_type: isPledge ? 'pledge' : 'donation',
      amount_minor: toMinor(int(5, institutional ? 8000 : 400) * 1000),
      currency: 'NGN',
      received_on: isPledge ? null : dateOnly(daysAgo(int(1, 380))),
      pledge_due_on: isPledge ? dateOnly(inDays(int(-30, 180))) : null,
      payment_method: pick(['Bank Transfer', 'Card', 'USSD', 'Cash', 'Cheque', 'Mobile Money']),
      status: isPledge ? 'pledged' : 'received',
      is_anonymous: anonymous,
      note: null,
    }
  })

  /* ------------------------------------------------------ beneficiaries */

  const households = Array.from({ length: Math.round(shape.beneficiaries / 3.2) }, (_, index) => {
    const location = pick(STATES)
    const size = int(3, 11)
    const children = int(1, Math.max(1, size - 2))
    const female = int(1, size - children)
    return {
      ...base,
      ...stamp(int(10, 500)),
      id: newId(),
      code: `HH-${String(index + 1).padStart(5, '0')}`,
      head_name: person(),
      size,
      female_count: female,
      male_count: size - female,
      children_count: children,
      income_band: pick(['Below ₦30,000/month', '₦30,000 – ₦70,000/month', '₦70,000 – ₦150,000/month', 'Above ₦150,000/month']),
      community: pick(COMMUNITIES),
      state: location[0],
      latitude: location[2] + (rand() - 0.5) * 0.5,
      longitude: location[3] + (rand() - 0.5) * 0.5,
    }
  })

  const beneficiaries = Array.from({ length: shape.beneficiaries }, (_, index) => {
    const household = pick(households)
    const gender = chance(0.54) ? 'female' : 'male'
    const age = int(2, 78)
    const location = STATES.find((state) => state[0] === household.state) ?? pick(STATES)
    return {
      ...base,
      ...stamp(int(1, 500)),
      id: newId(),
      code: `BEN-${String(index + 1).padStart(6, '0')}`,
      full_name: person(),
      household_id: household.id,
      gender,
      date_of_birth: dateOnly(daysAgo(age * 365 + int(0, 364))),
      age,
      phone: age > 17 && chance(0.6) ? phone() : null,
      id_type: age > 17 ? pick(['National ID', 'Voter Card', "Driver's Licence", 'Birth Certificate']) : 'Birth Certificate',
      id_number: `${int(1000, 9999)}-${int(1000, 9999)}-${int(10, 99)}`,
      country: 'Nigeria',
      state: household.state,
      lga: location[1],
      community: household.community,
      latitude: household.latitude,
      longitude: household.longitude,
      vulnerability: pickMany(VULNERABILITIES, int(1, 3)),
      status: pick(['registered', 'enrolled', 'active', 'active', 'active', 'graduated', 'exited']),
      is_anonymized: false,
      registered_on: dateOnly(daysAgo(int(5, 500))),
      notes: null,
    }
  })

  const enrollments = beneficiaries
    .filter(() => chance(0.82))
    .map((beneficiary) => {
      const project = projectFor()
      const completed = chance(0.3)
      return {
        ...base,
        ...stamp(int(5, 400)),
        id: newId(),
        beneficiary_id: beneficiary.id,
        project_id: project.id,
        program_id: project.program_id,
        enrolled_on: dateOnly(daysAgo(int(10, 400))),
        exit_on: completed ? dateOnly(daysAgo(int(1, 60))) : null,
        status: completed ? 'completed' : chance(0.94) ? 'active' : 'dropped',
        outcome: completed ? pick(['Completed full cycle of support', 'Transitioned to self-reliance', 'Graduated to savings group', 'Re-enrolled in formal school']) : null,
      }
    })

  const serviceTypes = ['Cash Transfer', 'Food Distribution', 'School Kit', 'Health Consultation', 'Nutrition Screening', 'Psychosocial Session', 'Skills Training', 'Hygiene Kit', 'Agricultural Inputs', 'Legal Support']
  const services = enrollments.flatMap((enrollment) =>
    Array.from({ length: int(1, 4) }, () => ({
      ...base,
      ...stamp(int(1, 300)),
      id: newId(),
      beneficiary_id: enrollment.beneficiary_id,
      project_id: enrollment.project_id,
      service_type: pick(serviceTypes),
      service_date: dateOnly(daysAgo(int(1, 300))),
      quantity: int(1, 6),
      unit: pick(['session', 'kit', 'visit', 'payment', 'bag']),
      value_minor: toMinor(int(2, 60) * 1000),
      delivered_by: pick(employees).id,
      location: pick(COMMUNITIES),
      note: null,
    })),
  )

  const cases = beneficiaries
    .filter(() => chance(0.12))
    .map((beneficiary, index) => {
      const closed = chance(0.4)
      return {
        ...base,
        ...stamp(int(5, 300)),
        id: newId(),
        code: buildReference('CSE', index + 1),
        beneficiary_id: beneficiary.id,
        case_type: pick(CASE_TYPES),
        priority: pick(['low', 'medium', 'medium', 'high', 'critical']),
        status: closed ? 'closed' : pick(['open', 'assessment', 'intervention', 'referred', 'follow_up']),
        case_worker_id: pick(employees).id,
        opened_on: dateOnly(daysAgo(int(5, 300))),
        closed_on: closed ? dateOnly(daysAgo(int(1, 60))) : null,
        summary: `Case opened following ${pick(['a community referral', 'a field officer identification', 'a self-referral at the centre', 'a partner referral'])}. Support plan agreed with the household.`,
        outcome: closed ? pick(['Family reunification achieved', 'Beneficiary reintegrated into school', 'Referred to specialised service and case closed', 'Support plan completed successfully']) : null,
      }
    })

  const caseNotes = cases.flatMap((caseFile) =>
    Array.from({ length: int(2, 5) }, (_, index) => ({
      ...base,
      ...stamp(int(1, 200)),
      id: newId(),
      case_id: caseFile.id,
      note_type: index === 0 ? 'assessment' : pick(['intervention', 'follow_up', 'note', 'referral']),
      note_date: dateOnly(daysAgo(int(1, 250))),
      content: pick(['Initial needs assessment completed with the caregiver present. Immediate priorities recorded.', 'Follow-up home visit conducted; household reported improvement in the agreed indicators.', 'Referral made to a partner service provider; feedback expected within fourteen days.', 'Support package delivered and acknowledged by the household.', 'Case reviewed with the supervisor; plan updated with revised milestones.']),
      author_id: pick(employees).id,
      referred_to: chance(0.25) ? pick(PARTNER_NAMES) : null,
    })),
  )

  /* ---------------------------------------------------------------- MEL */

  const indicators = projects.flatMap((project) =>
    pickMany(INDICATOR_TEMPLATES, int(2, 4)).map((template, index) => {
      const target = template[1] === '%' ? int(55, 95) : int(200, 6000)
      const baseline = template[1] === '%' ? int(5, 35) : int(0, Math.round(target * 0.2))
      const actual = Math.round(baseline + (target - baseline) * (project.progress_percent / 100) * (0.7 + rand() * 0.6))
      return {
        ...base,
        ...stamp(int(10, 400)),
        id: newId(),
        code: `${project.code.split('/').pop()}-IND-${index + 1}`,
        name: template[0] as string,
        project_id: project.id,
        program_id: project.program_id,
        level: template[2] as string,
        unit: template[1] as string,
        baseline_value: baseline,
        target_value: target,
        actual_value: Math.max(0, actual),
        disaggregation: pick(['Sex, Age', 'Sex, Location', 'Sex, Age, Disability', 'Location']),
        means_of_verification: pick(['Attendance registers and distribution lists', 'Post-distribution monitoring survey', 'Facility records and health register', 'Household survey', 'Training reports and certificates']),
        frequency: pick(['monthly', 'quarterly', 'biannual', 'annual']),
        is_active: true,
      }
    }),
  )

  const indicatorResults = indicators.flatMap((indicator) => {
    const periods = int(3, 6)
    let running = indicator.baseline_value
    return Array.from({ length: periods }, (_, index) => {
      const step = Math.round((indicator.actual_value - indicator.baseline_value) / periods)
      running += step
      const female = Math.round(running * (0.45 + rand() * 0.2))
      return {
        ...base,
        ...stamp(int(5, 300)),
        id: newId(),
        indicator_id: indicator.id,
        period_label: `Q${(index % 4) + 1} ${new Date().getFullYear() - Math.floor(index / 4)}`,
        period_date: dateOnly(daysAgo((periods - index) * 90)),
        value: Math.max(0, running),
        female_value: female,
        male_value: Math.max(0, running - female),
        location: pick(COMMUNITIES),
        source: pick(['Field monitoring', 'Partner report', 'Household survey', 'Facility register']),
        verified: chance(0.8),
        recorded_by: pick(employees).id,
      }
    })
  })

  const logframe = projects.slice(0, Math.ceil(projects.length * 0.6)).flatMap((project) => {
    const goalId = newId()
    const outcomeId = newId()
    const rows = [
      { id: goalId, level: 'goal', parent_id: null, sort_order: 1, statement: `Contribute to improved ${project.sector.toLowerCase()} outcomes in ${project.state} State.`, indicator: 'National sector indicator movement', baseline: 'Sector baseline 2023', target: '5% improvement', actual: `${int(1, 6)}% improvement` },
      { id: newId(), level: 'impact', parent_id: goalId, sort_order: 2, statement: `Sustained improvement in wellbeing among ${project.target_beneficiaries.toLocaleString()} targeted individuals.`, indicator: '% of beneficiaries reporting improved wellbeing', baseline: `${int(10, 30)}%`, target: `${int(60, 85)}%`, actual: `${int(35, 78)}%` },
      { id: outcomeId, level: 'outcome', parent_id: goalId, sort_order: 3, statement: `Target households adopt and sustain improved ${project.sector.toLowerCase()} practices.`, indicator: '% of households demonstrating adoption', baseline: `${int(5, 25)}%`, target: `${int(55, 80)}%`, actual: `${int(30, 72)}%` },
      { id: newId(), level: 'output', parent_id: outcomeId, sort_order: 4, statement: 'Beneficiaries receive quality services and inputs on schedule.', indicator: 'Number of beneficiaries served', baseline: '0', target: String(project.target_beneficiaries), actual: String(project.reached_beneficiaries) },
      { id: newId(), level: 'activity', parent_id: outcomeId, sort_order: 5, statement: 'Conduct community mobilisation, verification and distribution.', indicator: 'Number of activities completed', baseline: '0', target: String(int(8, 24)), actual: String(int(3, 20)) },
    ]
    return rows.map((row) => ({
      ...base,
      ...stamp(int(20, 300)),
      id: row.id,
      project_id: project.id,
      level: row.level,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      statement: row.statement,
      indicator: row.indicator,
      means_of_verification: pick(['Household survey', 'Distribution records', 'Monitoring visit reports', 'Partner data', 'Government statistics']),
      assumptions: pick(['Security situation permits continuous access.', 'Community leadership remains supportive.', 'Donor disbursements arrive on schedule.', 'No major climatic shock during implementation.']),
      baseline: row.baseline,
      target: row.target,
      actual: row.actual,
    }))
  })

  const evaluations = Array.from({ length: Math.max(3, Math.round(shape.projects / 3)) }, () => {
    const project = projectFor()
    const completed = chance(0.6)
    return {
      ...base,
      ...stamp(int(20, 400)),
      id: newId(),
      title: `${pick(['Baseline', 'Midterm', 'Endline', 'Impact', 'Process'])} Evaluation — ${project.title}`,
      project_id: project.id,
      program_id: project.program_id,
      evaluation_type: pick(['baseline', 'midterm', 'endline', 'impact', 'process', 'survey']),
      status: completed ? pick(['completed', 'published']) : pick(['planned', 'in_progress']),
      lead_id: pick(employees).id,
      planned_date: dateOnly(daysAgo(int(30, 300))),
      completed_date: completed ? dateOnly(daysAgo(int(5, 120))) : null,
      methodology: pick(['Mixed methods: household survey, key informant interviews and focus group discussions.', 'Quasi-experimental design with comparison communities.', 'Qualitative most-significant-change methodology.', 'Cross-sectional survey with 95% confidence level.']),
      sample_size: int(120, 900),
      key_findings: completed ? `Coverage targets were substantially achieved, with ${int(62, 94)}% of planned beneficiaries reached. Satisfaction with service quality stood at ${int(70, 95)}%, while access constraints in remote wards remain the principal delivery barrier.` : null,
      recommendations: completed ? 'Strengthen last-mile logistics, expand community feedback channels and integrate disability-inclusive targeting into the next phase.' : null,
    }
  })

  const learning = Array.from({ length: Math.max(6, Math.round(shape.projects / 2)) }, () => {
    const project = projectFor()
    const type = pick(['lesson', 'best_practice', 'success_story', 'knowledge'])
    return {
      ...base,
      ...stamp(int(5, 350)),
      id: newId(),
      title:
        type === 'success_story'
          ? `${person()}: ${pick(['A New Beginning', 'From Vulnerability to Enterprise', 'Back in the Classroom', 'Water Changed Everything', 'A Household Restored'])}`
          : pick(['Early community entry reduces targeting disputes', 'Digital data capture cut reporting lag by half', 'Partnering with traditional leaders improves attendance', 'Cash modality outperformed in-kind in market-functional areas', 'Joint monitoring with donors builds confidence', 'Layering services increases retention']),
      entry_type: type,
      project_id: project.id,
      category: project.sector,
      content:
        type === 'success_story'
          ? `Before the project, the household relied on a single seasonal income source. Following enrolment, support was delivered over ${int(3, 9)} months alongside skills training. The household now reports a stable income and has re-enrolled ${int(1, 4)} children in school.`
          : `Field teams observed that ${pick(['sequencing community entry before verification', 'using mobile data capture', 'co-locating services', 'engaging women-led committees'])} materially improved delivery quality. The practice is being adopted across the ${project.sector} portfolio.`,
      author_id: pick(employees).id,
      entry_date: dateOnly(daysAgo(int(5, 300))),
      tags: pickMany(['adaptive management', 'community engagement', 'digital', 'gender', 'localisation', 'quality'], int(1, 3)),
    }
  })

  /* -------------------------------------------------------- field ops */

  const fieldVisits = Array.from({ length: shape.fieldVisits }, (_, index) => {
    const project = projectFor()
    const location = STATES.find((state) => state[0] === project.state) ?? pick(STATES)
    const participants = int(12, 240)
    const female = Math.round(participants * (0.4 + rand() * 0.3))
    return {
      ...base,
      ...stamp(int(1, 300)),
      id: newId(),
      code: buildReference('FLD', index + 1),
      project_id: project.id,
      visit_type: pick(['monitoring', 'verification', 'distribution', 'assessment', 'supervision']),
      officer_id: pick(employees).id,
      visit_date: dateOnly(daysAgo(int(1, 280))),
      location: pick(COMMUNITIES),
      state: project.state,
      latitude: location[2] + (rand() - 0.5) * 0.6,
      longitude: location[3] + (rand() - 0.5) * 0.6,
      participants_count: participants,
      female_count: female,
      male_count: participants - female,
      findings: pick(['Distribution proceeded orderly; beneficiary list matched attendance with minor exceptions resolved on site.', 'Community reported satisfaction with the service; access road condition remains a constraint.', 'Verification exercise identified duplicate registrations which were removed from the list.', 'Facility observed to be functional; minor equipment gaps documented for follow-up.', 'Training attendance exceeded plan; facilitators recommended an additional refresher session.']),
      recommendations: pick(['Schedule a follow-up post-distribution monitoring visit within 14 days.', 'Escalate access road constraint to the local government authority.', 'Update the beneficiary register and re-issue tokens.', 'Provide the outstanding equipment through the next procurement cycle.']),
      status: chance(0.7) ? 'approved' : pick(['completed', 'submitted', 'planned']),
      photo_count: int(0, 14),
      synced_offline: chance(0.15),
    }
  })

  const volunteerAssignments = volunteers
    .filter(() => chance(0.7))
    .map((volunteer) => ({
      ...base,
      ...stamp(int(5, 300)),
      id: newId(),
      volunteer_id: volunteer.id,
      project_id: projectFor().id,
      role_title: pick(['Community Mobiliser', 'Data Collection Assistant', 'Health Educator', 'Distribution Support', 'Translator', 'Youth Facilitator']),
      start_date: dateOnly(daysAgo(int(20, 300))),
      end_date: chance(0.4) ? dateOnly(daysAgo(int(1, 40))) : null,
      hours_logged: int(10, 260),
      status: chance(0.7) ? 'assigned' : 'completed',
      performance_note: chance(0.5) ? pick(['Reliable and punctual; commended by the community committee.', 'Strong facilitation skills demonstrated during sessions.', 'Requires additional support with data quality checks.']) : null,
    }))

  /* -------------------------------------------------------------- HR */

  const leaveRequests = employees
    .filter(() => chance(0.5))
    .map((employee) => {
      const days = int(1, 21)
      const start = int(2, 200)
      return {
        ...base,
        ...stamp(start + 5),
        id: newId(),
        employee_id: employee.id,
        leave_type: pick(['annual', 'sick', 'maternity', 'paternity', 'compassionate', 'unpaid']),
        start_date: dateOnly(daysAgo(start)),
        end_date: dateOnly(daysAgo(Math.max(0, start - days))),
        days,
        reason: pick(['Annual rest', 'Medical treatment', 'Family responsibility', 'Study leave', 'Bereavement']),
        status: chance(0.7) ? 'approved' : pick(['pending', 'rejected', 'cancelled']),
        approver_id: pick(employees).id,
      }
    })

  const trainings = Array.from({ length: Math.max(6, Math.round(shape.employees / 3)) }, () => {
    const participants = int(8, 90)
    return {
      ...base,
      ...stamp(int(10, 400)),
      id: newId(),
      title: pick(['Child Safeguarding Refresher', 'Financial Management for Field Staff', 'Data Protection and Beneficiary Privacy', 'Monitoring and Evaluation Fundamentals', 'Community Facilitation Skills', 'Procurement Compliance Workshop', 'Psychological First Aid', 'Gender Mainstreaming in Programmes', 'Report Writing for Donors']),
      audience: pick(['staff', 'volunteer', 'partner', 'beneficiary']),
      training_date: dateOnly(daysAgo(int(5, 350))),
      facilitator: person(),
      location: pick(branches).name,
      participants,
      female_participants: Math.round(participants * (0.4 + rand() * 0.25)),
      cost_minor: toMinor(int(80, 2400) * 1000),
      certification_issued: chance(0.6),
      notes: null,
    }
  })

  /* -------------------------------------------------------- partners */

  const partners = pickMany(PARTNER_NAMES, Math.min(shape.partners, PARTNER_NAMES.length)).map(
    (name, index) => ({
      ...base,
      ...stamp(int(30, 800)),
      id: newId(),
      code: `PTR-${String(index + 1).padStart(3, '0')}`,
      name,
      partner_type: pick(['local', 'government', 'implementing', 'community', 'consultant', 'contractor', 'vendor']),
      contact_person: person(),
      email: emailFor(name.slice(0, 12), 'partner.org'),
      phone: phone(),
      address: `${int(1, 120)} ${pick(['Market', 'Station', 'Church', 'Mosque', 'Old Airport'])} Road, ${pick(STATES)[1]}`,
      country: 'Nigeria',
      agreement_ref: `MOU/${new Date().getFullYear()}/${String(index + 1).padStart(3, '0')}`,
      agreement_start: dateOnly(daysAgo(int(60, 700))),
      agreement_end: dateOnly(inDays(int(-60, 500))),
      capacity_score: int(45, 96),
      compliance_status: chance(0.75) ? 'compliant' : chance(0.6) ? 'pending_review' : 'non_compliant',
      status: chance(0.9) ? 'active' : 'inactive',
      total_paid_minor: toMinor(int(200, 45000) * 1000),
    }),
  )

  /* --------------------------------------------------------- finance */

  const accountSeed: [string, string, string][] = [
    ['1000', 'Cash and Bank', 'asset'],
    ['1100', 'Accounts Receivable', 'asset'],
    ['1200', 'Grants Receivable', 'asset'],
    ['1500', 'Fixed Assets', 'asset'],
    ['2000', 'Accounts Payable', 'liability'],
    ['2100', 'Accrued Expenses', 'liability'],
    ['2200', 'Deferred Grant Income', 'liability'],
    ['3000', 'Unrestricted Fund Balance', 'equity'],
    ['3100', 'Restricted Fund Balance', 'equity'],
    ['4000', 'Grant Income', 'income'],
    ['4100', 'Donation Income', 'income'],
    ['4200', 'Other Income', 'income'],
    ['5000', 'Programme Costs', 'expense'],
    ['5100', 'Staff Costs', 'expense'],
    ['5200', 'Travel and Transport', 'expense'],
    ['5300', 'Training and Workshops', 'expense'],
    ['5400', 'Supplies and Materials', 'expense'],
    ['5500', 'Beneficiary Assistance', 'expense'],
    ['5600', 'Office and Administration', 'expense'],
    ['5700', 'Monitoring and Evaluation', 'expense'],
    ['5800', 'Vehicle Running Costs', 'expense'],
    ['5900', 'Professional Fees', 'expense'],
  ]

  const accounts = accountSeed.map(([code, name, type]) => ({
    ...base,
    ...stamp(600),
    id: newId(),
    code,
    name,
    account_type: type,
    parent_code: null,
    is_restricted: code === '3100',
    is_active: true,
  }))

  const funds = [
    { name: 'General Unrestricted Fund', type: 'unrestricted' },
    { name: 'Education Restricted Fund', type: 'restricted' },
    { name: 'Health Restricted Fund', type: 'restricted' },
    { name: 'Emergency Response Fund', type: 'temporarily_restricted' },
    { name: 'Endowment Reserve', type: 'endowment' },
    { name: 'WASH Restricted Fund', type: 'restricted' },
  ].map((entry, index) => ({
    ...base,
    ...stamp(500 - index * 10),
    id: newId(),
    code: `FND-${String(index + 1).padStart(2, '0')}`,
    name: entry.name,
    fund_type: entry.type,
    donor_id: entry.type === 'restricted' ? pick(donors).id : null,
    opening_balance_minor: toMinor(int(2, 120) * 1_000_000),
    balance_minor: toMinor(int(1, 180) * 1_000_000),
    currency: 'NGN',
    is_active: true,
  }))

  const bankAccounts = [
    { name: 'Main Operating Account', type: 'current', bank: 'First Continental Bank' },
    { name: 'Donor Project Account (USD)', type: 'project', bank: 'Atlantic Trust Bank', currency: 'USD' },
    { name: 'Payroll Account', type: 'current', bank: 'First Continental Bank' },
    { name: 'Reserve Savings', type: 'savings', bank: 'Unity Savings Bank' },
    { name: 'Petty Cash — Head Office', type: 'petty_cash', bank: 'Cash on Hand' },
  ].map((entry) => ({
    ...base,
    ...stamp(int(200, 600)),
    id: newId(),
    name: entry.name,
    bank_name: entry.bank,
    account_number_masked: `****${int(1000, 9999)}`,
    account_type: entry.type,
    currency: entry.currency ?? 'NGN',
    balance_minor: toMinor(int(1, 260) * 1_000_000),
    is_active: true,
  }))

  const budgetLines = projects.flatMap((project) =>
    pickMany(EXPENSE_CATEGORIES, int(4, 8)).map((category) => {
      const budgeted = Math.round(project.budget_minor / int(5, 10))
      return {
        ...base,
        ...stamp(int(30, 400)),
        id: newId(),
        project_id: project.id,
        grant_id: project.grant_id,
        category,
        line_item: `${category} — ${project.code}`,
        account_code: pick(accounts.filter((a) => a.account_type === 'expense')).code,
        budgeted_minor: budgeted,
        spent_minor: Math.round(budgeted * (project.progress_percent / 100) * (0.6 + rand() * 0.7)),
        currency: 'NGN',
        period: `FY${new Date().getFullYear()}`,
      }
    }),
  )

  const transactions = Array.from({ length: shape.transactions }, (_, index) => {
    const isIncome = chance(0.28)
    const project = projectFor()
    const budgetLine = budgetLines.find((line) => line.project_id === project.id) ?? pick(budgetLines)
    const account = isIncome
      ? pick(accounts.filter((a) => a.account_type === 'income'))
      : pick(accounts.filter((a) => a.account_type === 'expense'))
    return {
      ...base,
      ...stamp(int(1, 380)),
      id: newId(),
      reference: buildReference(isIncome ? 'RCT' : 'PVR', index + 1),
      txn_date: dateOnly(daysAgo(int(1, 380))),
      txn_type: isIncome ? 'income' : 'expense',
      account_code: account.code,
      fund_id: pick(funds).id,
      project_id: project.id,
      grant_id: project.grant_id,
      donor_id: isIncome ? project.donor_id : null,
      partner_id: !isIncome && chance(0.35) ? pick(partners).id : null,
      description: isIncome
        ? `${pick(['Grant tranche received', 'Donation received', 'Interest income', 'Refund received'])} — ${project.code}`
        : `${pick(EXPENSE_CATEGORIES)} — ${project.code}`,
      amount_minor: toMinor(int(20, isIncome ? 90000 : 4200) * 1000),
      currency: 'NGN',
      exchange_rate: 1,
      base_amount_minor: 0,
      payment_method: pick(['Bank Transfer', 'Cheque', 'Cash', 'Mobile Money']),
      budget_line_id: budgetLine.id,
      reversal_of: null,
      status: chance(0.94) ? 'posted' : pick(['draft', 'reversed']),
    }
  }).map((txn) => ({ ...txn, base_amount_minor: txn.amount_minor }))

  /* ----------------------------------------------------- procurement */

  const purchaseRequests = Array.from({ length: Math.max(8, Math.round(shape.projects * 1.4)) }, (_, index) => {
    const project = projectFor()
    const status = pick(['draft', 'pending_approval', 'approved', 'approved', 'ordered', 'received', 'closed', 'rejected'])
    return {
      ...base,
      ...stamp(int(5, 300)),
      id: newId(),
      reference: buildReference('PR', index + 1),
      title: pick(['Procurement of school kits', 'Supply of hygiene materials', 'Hire of training venue', 'Purchase of office equipment', 'Supply of agricultural inputs', 'Vehicle maintenance services', 'Printing of IEC materials', 'Supply of nutrition commodities', 'Fuel supply contract', 'Purchase of field tablets']),
      project_id: project.id,
      requested_by: pick(employees).id,
      request_date: dateOnly(daysAgo(int(5, 300))),
      needed_by: dateOnly(inDays(int(-40, 90))),
      estimated_minor: toMinor(int(150, 9000) * 1000),
      currency: 'NGN',
      justification: 'Required to deliver planned project activities within the approved implementation schedule.',
      status,
      approval_instance_id: null,
    }
  })

  const quotations = purchaseRequests
    .filter((request) => ['approved', 'ordered', 'received', 'closed'].includes(request.status))
    .flatMap((request) => {
      const count = int(2, 4)
      const winner = int(0, count - 1)
      return Array.from({ length: count }, (_, index) => ({
        ...base,
        ...stamp(int(5, 250)),
        id: newId(),
        request_id: request.id,
        partner_id: pick(partners).id,
        vendor_name: pick(PARTNER_NAMES),
        quote_date: dateOnly(daysAgo(int(5, 250))),
        amount_minor: Math.round(request.estimated_minor * (0.82 + rand() * 0.4)),
        currency: 'NGN',
        lead_time_days: int(3, 30),
        technical_score: int(55, 98),
        selected: index === winner,
        remarks: index === winner ? 'Selected on best value for money and technical compliance.' : null,
      }))
    })

  const purchaseOrders = purchaseRequests
    .filter((request) => ['ordered', 'received', 'closed'].includes(request.status))
    .map((request, index) => {
      const received = request.status !== 'ordered'
      const winning = quotations.find((quote) => quote.request_id === request.id && quote.selected)
      return {
        ...base,
        ...stamp(int(3, 240)),
        id: newId(),
        reference: buildReference('PO', index + 1),
        request_id: request.id,
        partner_id: winning?.partner_id ?? pick(partners).id,
        order_date: dateOnly(daysAgo(int(3, 240))),
        expected_date: dateOnly(inDays(int(-30, 45))),
        total_minor: winning?.amount_minor ?? request.estimated_minor,
        currency: 'NGN',
        status: received ? pick(['received', 'invoiced', 'closed']) : 'issued',
        received_date: received ? dateOnly(daysAgo(int(1, 100))) : null,
        invoice_ref: received ? `INV-${int(10000, 99999)}` : null,
        notes: null,
      }
    })

  /* ------------------------------------------------- inventory/assets */

  const warehouses = branches.slice(0, Math.min(branches.length, 4)).map((branch, index) => ({
    ...base,
    ...stamp(400 - index * 10),
    id: newId(),
    code: `WH-${String(index + 1).padStart(2, '0')}`,
    name: `${branch.state} Central Store`,
    location: branch.city,
    state: branch.state,
    manager_id: pick(employees).id,
    is_active: true,
  }))

  const inventory = Array.from({ length: Math.max(12, Math.round(shape.projects * 1.6)) }, (_, index) => {
    const item = pick(ITEM_POOL)
    return {
      ...base,
      ...stamp(int(10, 300)),
      id: newId(),
      sku: `SKU-${String(index + 1).padStart(4, '0')}`,
      name: item[0],
      category: item[1],
      unit: item[2],
      warehouse_id: pick(warehouses).id,
      quantity: int(0, 4200),
      reorder_level: int(50, 400),
      unit_cost_minor: toMinor(int(200, 45000)),
      currency: 'NGN',
      expiry_date: item[1] === 'Nutrition' || item[1] === 'Health Supplies' ? dateOnly(inDays(int(-30, 500))) : null,
      is_consumable: item[1] !== 'ICT Equipment',
    }
  })

  const stockMovements = inventory.flatMap((item) => {
    let balance = 0
    return Array.from({ length: int(2, 6) }, () => {
      const type = chance(0.45) ? 'receipt' : pick(['issue', 'transfer', 'adjustment', 'loss'])
      const quantity = type === 'receipt' ? int(50, 900) : int(5, 260)
      balance = type === 'receipt' ? balance + quantity : Math.max(0, balance - quantity)
      return {
        ...base,
        ...stamp(int(1, 280)),
        id: newId(),
        item_id: item.id,
        movement_type: type,
        quantity,
        balance_after: balance,
        warehouse_id: item.warehouse_id,
        destination_warehouse_id: type === 'transfer' ? pick(warehouses).id : null,
        project_id: type === 'issue' ? projectFor().id : null,
        beneficiary_id: null,
        movement_date: dateOnly(daysAgo(int(1, 280))),
        reference: `STK-${int(10000, 99999)}`,
        note: null,
      }
    })
  })

  const assets = Array.from({ length: Math.max(10, Math.round(shape.employees * 0.8)) }, (_, index) => {
    const category = pick(['vehicle', 'equipment', 'computer', 'medical', 'furniture', 'other'])
    return {
      ...base,
      ...stamp(int(30, 900)),
      id: newId(),
      tag: `AST-${String(index + 1).padStart(4, '0')}`,
      name: category === 'computer' ? pick(['Dell Latitude Laptop', 'HP ProBook Laptop', 'Desktop Workstation', 'Field Tablet']) : category === 'vehicle' ? pick(['Toyota Hilux', 'Toyota Land Cruiser', 'Motorcycle', 'Minibus']) : category === 'medical' ? pick(['Portable Ultrasound', 'Vaccine Refrigerator', 'Weighing Scale', 'Blood Pressure Monitor']) : pick(['Generator 10KVA', 'Office Desk', 'Projector', 'Solar Inverter', 'Water Pump', 'Printer']),
      category,
      serial_number: `SN${int(100000, 999999)}`,
      project_id: chance(0.6) ? projectFor().id : null,
      assigned_to: chance(0.6) ? pick(employees).id : null,
      location: pick(branches).name,
      purchase_date: dateOnly(daysAgo(int(60, 1500))),
      purchase_cost_minor: toMinor(int(120, 42000) * 1000),
      currency: 'NGN',
      condition: pick(['new', 'good', 'good', 'fair', 'poor']),
      status: chance(0.75) ? 'in_use' : pick(['in_store', 'maintenance', 'disposed']),
      next_maintenance: chance(0.5) ? dateOnly(inDays(int(-30, 180))) : null,
      donor_id: chance(0.5) ? pick(donors).id : null,
    }
  })

  const vehicles = Array.from({ length: Math.max(4, Math.round(shape.branches * 1.5)) }, (_, index) => ({
    ...base,
    ...stamp(int(60, 1200)),
    id: newId(),
    plate_number: `${pick(['ABC', 'JOS', 'KAD', 'LAG', 'MKD'])}-${int(100, 999)}${pick(['XA', 'ZB', 'KL', 'RT'])}`,
    make: pick(['Toyota', 'Nissan', 'Mitsubishi', 'Ford']),
    model: pick(['Hilux', 'Land Cruiser', 'Patrol', 'Ranger', 'Hiace']),
    year: int(2014, 2024),
    vehicle_type: pick(['Pickup', '4x4 Hardtop', 'Minibus', 'Motorcycle', 'Truck']),
    driver_id: pick(employees).id,
    project_id: chance(0.7) ? projectFor().id : null,
    odometer_km: int(12000, 220000),
    fuel_type: pick(['Diesel', 'Petrol']),
    insurance_expiry: dateOnly(inDays(int(-40, 300))),
    registration_expiry: dateOnly(inDays(int(-40, 300))),
    status: chance(0.65) ? 'available' : pick(['on_trip', 'maintenance', 'grounded']),
    location: pick(branches).name,
    branch_id: branches[index % branches.length]?.id ?? null,
  }))

  const trips = vehicles.flatMap((vehicle) =>
    Array.from({ length: int(2, 8) }, () => {
      const distance = int(30, 620)
      return {
        ...base,
        ...stamp(int(1, 200)),
        id: newId(),
        vehicle_id: vehicle.id,
        driver_id: vehicle.driver_id,
        project_id: vehicle.project_id,
        purpose: pick(['Field monitoring visit', 'Distribution exercise', 'Staff movement', 'Supply delivery', 'Partner meeting', 'Beneficiary verification']),
        start_date: dateOnly(daysAgo(int(1, 200))),
        end_date: dateOnly(daysAgo(int(0, 199))),
        origin: pick(branches).city ?? 'Head Office',
        destination: pick(COMMUNITIES),
        start_km: vehicle.odometer_km - distance,
        end_km: vehicle.odometer_km,
        distance_km: distance,
        fuel_litres: Math.round(distance / int(6, 11)),
        fuel_cost_minor: toMinor(Math.round(distance * int(180, 320))),
        status: chance(0.85) ? 'completed' : pick(['planned', 'ongoing']),
      }
    }),
  )

  const maintenance = vehicles.flatMap((vehicle) =>
    Array.from({ length: int(1, 3) }, () => ({
      ...base,
      ...stamp(int(10, 400)),
      id: newId(),
      vehicle_id: vehicle.id,
      asset_id: null,
      maintenance_type: pick(['routine', 'repair', 'inspection']),
      service_date: dateOnly(daysAgo(int(10, 400))),
      odometer_km: vehicle.odometer_km - int(1000, 30000),
      provider: pick(['Peak Vehicle Services', 'Authorised Dealership', 'Northline Auto Works']),
      cost_minor: toMinor(int(25, 900) * 1000),
      currency: 'NGN',
      description: pick(['Routine service — oil, filters and brake inspection', 'Suspension repair after field deployment', 'Tyre replacement (set of four)', 'Annual roadworthiness inspection']),
      next_due: dateOnly(inDays(int(-20, 180))),
    })),
  )

  /* ------------------------------------------- compliance/governance */

  const compliance = [
    { title: 'CAC Incorporated Trustees Registration', category: 'registration', authority: 'Corporate Affairs Commission' },
    { title: 'SCUML Registration Certificate', category: 'registration', authority: 'SCUML / EFCC' },
    { title: 'Tax Exemption Certificate', category: 'tax', authority: 'Federal Inland Revenue Service' },
    { title: 'Annual Returns Filing', category: 'statutory', authority: 'Corporate Affairs Commission' },
    { title: 'NGO Operating Permit — State', category: 'license', authority: 'State Ministry of Budget & Planning' },
    { title: 'External Audit — Financial Year', category: 'audit', authority: 'Independent Auditors' },
    { title: 'Data Protection Compliance Audit', category: 'statutory', authority: 'Nigeria Data Protection Commission' },
    { title: 'Donor Due Diligence Questionnaire', category: 'donor', authority: 'Institutional Donor' },
    { title: 'PAYE Remittance Certificate', category: 'tax', authority: 'State Internal Revenue Service' },
    { title: 'Pension Compliance Certificate', category: 'certification', authority: 'National Pension Commission' },
  ].map((entry, index) => {
    const expiryDays = int(-60, 400)
    return {
      ...base,
      ...stamp(int(60, 900)),
      id: newId(),
      title: entry.title,
      category: entry.category,
      authority: entry.authority,
      reference_number: `${entry.category.toUpperCase().slice(0, 3)}/${int(10000, 99999)}`,
      issue_date: dateOnly(daysAgo(int(200, 900))),
      expiry_date: dateOnly(inDays(expiryDays)),
      responsible_id: pick(employees).id,
      status: expiryDays < 0 ? 'expired' : expiryDays < 60 ? 'due_soon' : chance(0.9) ? 'valid' : 'in_progress',
      notes: null,
      sort: index,
    }
  }).map(({ sort: _sort, ...rest }) => rest)

  const meetings = Array.from({ length: 6 }, (_, index) => ({
    ...base,
    ...stamp(int(20, 500)),
    id: newId(),
    title: `${pick(['Quarterly Board Meeting', 'Annual General Meeting', 'Finance & Audit Committee', 'Management Review Meeting', 'Emergency Board Session', 'Programme Committee Meeting'])} — Q${(index % 4) + 1}`,
    meeting_type: pick(['board', 'management', 'agm', 'committee']),
    meeting_date: dateOnly(daysAgo(int(10, 500))),
    location: pick(['Head Office Boardroom', 'Virtual (Video Conference)', 'Hilltop Conference Centre']),
    chairperson: person(),
    attendees_count: int(5, 18),
    quorum_met: chance(0.9),
    agenda: 'Approval of previous minutes; financial performance review; programme progress; risk register; any other business.',
    minutes: chance(0.8) ? 'Minutes recorded and adopted. Action points assigned with agreed timelines and responsible officers.' : null,
    status: chance(0.85) ? 'held' : pick(['scheduled', 'cancelled']),
  }))

  const resolutions = meetings
    .filter((meeting) => meeting.status === 'held')
    .flatMap((meeting) =>
      Array.from({ length: int(1, 3) }, (_, index) => ({
        ...base,
        ...stamp(int(10, 400)),
        id: newId(),
        meeting_id: meeting.id,
        reference: `RES/${new Date().getFullYear()}/${int(100, 999)}`,
        title: pick(['Approval of the annual budget', 'Adoption of the revised safeguarding policy', 'Appointment of external auditors', 'Approval of the strategic plan', 'Authorisation of a new bank signatory', 'Approval of the reserves policy']),
        resolution_date: meeting.meeting_date,
        body: 'It was resolved that the item as presented be and is hereby approved, with implementation delegated to management and progress reported at the next sitting.',
        proposed_by: person(),
        status: chance(0.8) ? 'passed' : pick(['proposed', 'implemented']),
        sort: index,
      })).map(({ sort: _sort, ...rest }) => rest),
    )

  const policies = [
    'Safeguarding and Child Protection Policy',
    'Anti-Fraud, Bribery and Corruption Policy',
    'Financial Management Manual',
    'Procurement Policy and Procedures',
    'Human Resources Manual',
    'Data Protection and Privacy Policy',
    'Whistleblowing Policy',
    'Gender and Inclusion Policy',
    'Security Management Plan',
    'Environmental Sustainability Policy',
  ].map((title, index) => ({
    ...base,
    ...stamp(int(60, 900)),
    id: newId(),
    title,
    category: pick(['Governance', 'Finance', 'Operations', 'People', 'Safeguarding']),
    version: `v${int(1, 4)}.${int(0, 9)}`,
    effective_date: dateOnly(daysAgo(int(100, 900))),
    review_date: dateOnly(inDays(int(-60, 500))),
    owner_id: pick(employees).id,
    status: index < 7 ? 'active' : pick(['under_review', 'draft']),
    content: 'This policy sets out the organization\'s commitments, standards and procedures. All staff, volunteers and partners are required to comply.',
  }))

  /* --------------------------------------------------------- documents */

  const documents = Array.from({ length: Math.max(14, Math.round(shape.projects * 1.5)) }, (_, index) => {
    const project = projectFor()
    const type = pick(['Grant Agreement', 'Donor Report', 'Project Proposal', 'MOU', 'Financial Report', 'Field Report', 'Board Minutes', 'Audit Report', 'Beneficiary Consent Form', 'Procurement File', 'Evaluation Report', 'Annual Report'])
    return {
      ...base,
      ...stamp(int(5, 400)),
      id: newId(),
      title: `${type} — ${project.code}`,
      doc_type: type,
      category: pick(['Grants', 'Projects', 'Finance', 'Governance', 'Procurement', 'MEL', 'Beneficiaries']),
      version: int(1, 3),
      file_name: `${type.toLowerCase().replace(/\s+/g, '-')}-${index + 1}.pdf`,
      file_size: int(80, 4200) * 1024,
      storage_path: null,
      content: chance(0.4) ? 'Generated by the NegoLinks Intelligence Engine from live organizational data.' : null,
      project_id: project.id,
      grant_id: project.grant_id,
      donor_id: project.donor_id,
      partner_id: null,
      beneficiary_id: null,
      access_level: pick(['internal', 'internal', 'restricted', 'confidential', 'public']),
      verification_code: `NGO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      ai_generated: chance(0.35),
      status: pick(['final', 'final', 'signed', 'draft', 'archived']),
      author_id: pick(employees).id,
    }
  })

  /* ------------------------------------------- calendar/notifications */

  const calendar = [
    ...grants
      .filter((grant) => grant.next_report_due)
      .slice(0, 12)
      .map((grant) => ({
        ...base,
        ...stamp(int(1, 40)),
        id: newId(),
        title: `Donor report due — ${grant.code}`,
        event_type: 'deadline',
        start_at: `${grant.next_report_due}T09:00:00.000Z`,
        end_at: null,
        all_day: true,
        location: null,
        related_module: 'grants',
        related_id: grant.id,
        owner_id: pick(employees).id,
      })),
    ...Array.from({ length: 12 }, () => {
      const start = inDays(int(-10, 60))
      return {
        ...base,
        ...stamp(int(1, 40)),
        id: newId(),
        title: pick(['Field monitoring visit', 'Board meeting', 'Staff training session', 'Partner review meeting', 'Distribution exercise', 'Programme quality review', 'Donor site visit', 'Payroll cut-off']),
        event_type: pick(['meeting', 'field_visit', 'training', 'report', 'other']),
        start_at: start,
        end_at: null,
        all_day: chance(0.4),
        location: pick(COMMUNITIES),
        related_module: null,
        related_id: null,
        owner_id: pick(employees).id,
      }
    }),
  ]

  const notifications = [
    ...grants
      .filter((grant) => grant.compliance_status !== 'compliant')
      .slice(0, 5)
      .map((grant) => ({
        ...base,
        ...stamp(int(0, 10)),
        id: newId(),
        user_id: null,
        title: 'Grant compliance attention required',
        message: `${grant.code} is flagged as ${grant.compliance_status.replace('_', ' ')}. Review donor requirements and outstanding reports.`,
        type: 'warning',
        priority: 'high',
        category: 'grants',
        read: chance(0.3),
        read_at: null,
        action_url: '/app/grants',
        channels: ['inapp', 'email'],
      })),
    ...Array.from({ length: 10 }, () => ({
      ...base,
      ...stamp(int(0, 14)),
      id: newId(),
      user_id: null,
      title: pick(['New purchase request awaiting approval', 'Field report submitted for review', 'Beneficiary verification completed', 'Monthly financial report generated', 'Indicator data collection due', 'Compliance certificate expiring soon', 'New donation received', 'Volunteer application received']),
      message: pick(['A new item requires your attention in the workspace.', 'Review and action this item at your earliest convenience.', 'This item was generated automatically by the platform.']),
      type: pick(['info', 'success', 'warning', 'approval', 'ai']),
      priority: pick(['low', 'normal', 'normal', 'high']),
      category: pick(['procurement', 'field', 'finance', 'mel', 'compliance', 'fundraising']),
      read: chance(0.45),
      read_at: null,
      action_url: null,
      channels: ['inapp'],
    })),
  ]

  /* ----------------------------------------------------------- output */

  const tables: { table: string; rows: Record<string, unknown>[] }[] = [
    { table: TABLES.branches, rows: branches },
    { table: TABLES.departments, rows: departments },
    { table: TABLES.boardMembers, rows: boardMembers },
    { table: TABLES.employees, rows: employees },
    { table: TABLES.volunteers, rows: volunteers },
    { table: TABLES.volunteerAssignments, rows: volunteerAssignments },
    { table: TABLES.leaveRequests, rows: leaveRequests },
    { table: TABLES.trainings, rows: trainings },
    { table: TABLES.donors, rows: donors },
    { table: TABLES.programs, rows: programs },
    { table: TABLES.grants, rows: grants },
    { table: TABLES.grantDisbursements, rows: grantDisbursements },
    { table: TABLES.grantReports, rows: grantReports },
    { table: TABLES.projects, rows: projects },
    { table: TABLES.projectActivities, rows: projectActivities },
    { table: TABLES.projectRisks, rows: [...projectRisks, ...organizationalRisks] },
    { table: TABLES.projectTeam, rows: projectTeam },
    { table: TABLES.campaigns, rows: campaigns },
    { table: TABLES.donations, rows: donations },
    { table: TABLES.households, rows: households },
    { table: TABLES.beneficiaries, rows: beneficiaries },
    { table: TABLES.enrollments, rows: enrollments },
    { table: TABLES.services, rows: services },
    { table: TABLES.cases, rows: cases },
    { table: TABLES.caseNotes, rows: caseNotes },
    { table: TABLES.indicators, rows: indicators },
    { table: TABLES.indicatorResults, rows: indicatorResults },
    { table: TABLES.logframe, rows: logframe },
    { table: TABLES.evaluations, rows: evaluations },
    { table: TABLES.learning, rows: learning },
    { table: TABLES.fieldVisits, rows: fieldVisits },
    { table: TABLES.partners, rows: partners },
    { table: TABLES.accounts, rows: accounts },
    { table: TABLES.funds, rows: funds },
    { table: TABLES.bankAccounts, rows: bankAccounts },
    { table: TABLES.budgetLines, rows: budgetLines },
    { table: TABLES.transactions, rows: transactions },
    { table: TABLES.purchaseRequests, rows: purchaseRequests },
    { table: TABLES.quotations, rows: quotations },
    { table: TABLES.purchaseOrders, rows: purchaseOrders },
    { table: TABLES.warehouses, rows: warehouses },
    { table: TABLES.inventory, rows: inventory },
    { table: TABLES.stockMovements, rows: stockMovements },
    { table: TABLES.assets, rows: assets },
    { table: TABLES.vehicles, rows: vehicles },
    { table: TABLES.trips, rows: trips },
    { table: TABLES.maintenance, rows: maintenance },
    { table: TABLES.compliance, rows: compliance },
    { table: TABLES.meetings, rows: meetings },
    { table: TABLES.resolutions, rows: resolutions },
    { table: TABLES.policies, rows: policies },
    { table: TABLES.documents, rows: documents },
    { table: TABLES.calendar, rows: calendar },
    { table: TABLES.notifications, rows: notifications },
  ]

  const summary = [
    { label: 'Projects', count: projects.length },
    { label: 'Programmes', count: programs.length },
    { label: 'Donors', count: donors.length },
    { label: 'Grants', count: grants.length },
    { label: 'Beneficiaries', count: beneficiaries.length },
    { label: 'Staff', count: employees.length },
    { label: 'Volunteers', count: volunteers.length },
    { label: 'Partners', count: partners.length },
    { label: 'Transactions', count: transactions.length },
    { label: 'Field visits', count: fieldVisits.length },
    { label: 'Indicators', count: indicators.length },
    { label: 'Documents', count: documents.length },
  ]

  return {
    orgPatch: {
      name: orgName,
      legal_name: `${orgName} (Incorporated Trustees)`,
      org_type: pick(['NGO', 'Foundation', 'Nonprofit Organization', 'Development Organization', 'Humanitarian Organization']),
      registration_number: `CAC/IT/${int(100000, 999999)}`,
      tax_id: `TIN-${int(10000000, 99999999)}`,
      address: `${int(1, 60)} Rukuba Road`,
      city: 'Jos',
      state: 'Plateau',
      country: 'Nigeria',
      email: `info@${domain}`,
      phone: phone(),
      website: `https://www.${domain}`,
      mission: `To improve the wellbeing, dignity and resilience of vulnerable communities through ${pick(['integrated', 'community-led', 'evidence-based'])} programming in education, health, livelihoods and protection.`,
      vision: 'Communities where every household is safe, healthy and economically secure.',
      demo_mode: true,
    },
    tables,
    summary,
  }
}
