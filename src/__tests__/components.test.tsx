import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Badge, KPICard, ProgressBar, statusTone } from '@/components/negolinks/Primitives'
import { DataTable } from '@/components/negolinks/DataTable'
import { RecordForm } from '@/components/negolinks/RecordForm'
import { Wallet } from 'lucide-react'

describe('KPICard', () => {
  it('renders its title and value', () => {
    render(<KPICard title="Total Projects" value="24" icon={Wallet} />)
    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
  })

  it('shows a skeleton instead of the value while loading', () => {
    const { container } = render(<KPICard title="Budget" value="100" icon={Wallet} loading />)
    expect(container.querySelector('.nl-skeleton')).toBeTruthy()
    expect(screen.queryByText('100')).toBeNull()
  })

  it('renders the hint when supplied', () => {
    render(<KPICard title="Grants" value="9" icon={Wallet} hint="3 expiring soon" />)
    expect(screen.getByText('3 expiring soon')).toBeInTheDocument()
  })
})

describe('ProgressBar', () => {
  it('clamps values above 100 so the bar never overflows', () => {
    const { container } = render(<ProgressBar value={250} showLabel />)
    const fill = container.querySelector('[data-progress-fill]') as HTMLElement | null
    expect(fill?.style.width).toBe('100%')
  })

  it('clamps negative values to zero', () => {
    const { container } = render(<ProgressBar value={-40} />)
    const fill = container.querySelector('[data-progress-fill]') as HTMLElement | null
    expect(fill?.style.width).toBe('0%')
  })
})

describe('statusTone', () => {
  it('maps healthy states to success', () => {
    expect(statusTone('active')).toBe('success')
    expect(statusTone('approved')).toBe('success')
    expect(statusTone('compliant')).toBe('success')
  })

  it('maps failure states to danger', () => {
    expect(statusTone('expired')).toBe('danger')
    expect(statusTone('rejected')).toBe('danger')
  })

  it('maps wound-down states to neutral', () => {
    expect(statusTone('closed')).toBe('neutral')
    expect(statusTone('archived')).toBe('neutral')
  })

  it('falls back to the accent tone for unmapped states', () => {
    expect(statusTone('something_unmapped')).toBe('accent')
  })
})

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge tone="success">Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})

interface Row {
  id: string
  code: string
  title: string
  amount: number
}

const rows: Row[] = [
  { id: '1', code: 'PRJ-001', title: 'Water Access', amount: 300 },
  { id: '2', code: 'PRJ-002', title: 'School Build', amount: 100 },
  { id: '3', code: 'PRJ-003', title: 'Health Outreach', amount: 200 },
]

const columns = [
  { key: 'code', header: 'Code' },
  { key: 'title', header: 'Title' },
  { key: 'amount', header: 'Amount', align: 'right' as const },
]

describe('DataTable', () => {
  it('renders every row', () => {
    render(<DataTable<Row> data={rows} columns={columns} />)
    expect(screen.getAllByText('Water Access').length).toBeGreaterThan(0)
    expect(screen.getAllByText('School Build').length).toBeGreaterThan(0)
  })

  it('filters rows by the search box once the input settles', async () => {
    render(<DataTable<Row> data={rows} columns={columns} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Water' } })
    // The search input is debounced, so the table updates shortly after typing.
    await waitFor(() => expect(screen.queryByText('School Build')).toBeNull())
    expect(screen.getAllByText('Water Access').length).toBeGreaterThan(0)
  })

  it('shows an empty state when nothing matches', async () => {
    render(<DataTable<Row> data={rows} columns={columns} emptyTitle="No projects yet" />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzzznomatch' } })
    await waitFor(() =>
      expect(screen.getByText(/no results|no projects yet/i)).toBeInTheDocument(),
    )
  })

  it('sorts when a column header is activated', () => {
    const { container } = render(<DataTable<Row> data={rows} columns={columns} />)
    fireEvent.click(screen.getByRole('button', { name: /amount/i }))
    const table = container.querySelector('table') as HTMLElement
    const firstDataRow = within(table).getAllByRole('row').at(1)
    expect(firstDataRow).toBeDefined()
    expect(within(firstDataRow as HTMLElement).getByText('100')).toBeInTheDocument()
  })

  it('renders an empty state for an empty data set', () => {
    render(<DataTable<Row> data={[]} columns={columns} emptyTitle="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})

describe('RecordForm', () => {
  const fields = [
    { name: 'title', label: 'Title', type: 'text' as const, required: true },
    { name: 'amount', label: 'Amount', type: 'money' as const },
  ]

  it('blocks submission and reports missing required fields', () => {
    const onSubmit = vi.fn()
    render(
      <RecordForm title="New Project" fields={fields} isOpen onClose={() => {}} onSubmit={onSubmit} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
  })

  it('submits the entered values once required fields are filled', () => {
    const onSubmit = vi.fn()
    render(
      <RecordForm title="New Project" fields={fields} isOpen onClose={() => {}} onSubmit={onSubmit} />,
    )
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Borehole Project' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls.at(0)?.at(0)).toMatchObject({ title: 'Borehole Project' })
  })

  it('renders nothing when closed', () => {
    render(
      <RecordForm title="Hidden" fields={fields} isOpen={false} onClose={() => {}} onSubmit={vi.fn()} />,
    )
    expect(screen.queryByText('Hidden')).toBeNull()
  })
})
