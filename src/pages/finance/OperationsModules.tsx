import { useMemo, useState, type FC } from 'react'
import {
  Activity,
  AlertTriangle,
  Banknote,
  Boxes,
  Building,
  Coins,
  Landmark,
  Package,
  PieChart,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react'
import { AppShell } from '@/components/negolinks/AppShell'
import { DataTable } from '@/components/negolinks/DataTable'
import { ModulePage } from '@/components/negolinks/ModulePage'
import {
  Badge,
  ChartCard,
  KPICard,
  KPICardGrid,
  PageHeader,
  ProgressBar,
  TabBar,
  statusTone,
} from '@/components/negolinks/Primitives'
import { ComparisonBars, DonutChart, TrendChart } from '@/components/charts'
import { useCollection } from '@/hooks/useData'
import { TABLES } from '@/lib/tables'
import { useAppStore } from '@/stores/app.store'
import {
  daysBetween,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  groupBy,
  percentOf,
  sum,
  titleCase,
  toMajor,
} from '@/lib/utils'
import type {
  Asset,
  BudgetLine,
  ComplianceItem,
  Fund,
  InventoryItem,
  Policy,
  Project,
  ProjectRisk,
  PurchaseOrder,
  PurchaseRequest,
  Transaction,
  Vehicle,
  BoardMeeting,
} from '@/types'

const optionsOf = (values: string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ------------------------------------------------------------- Finance */

export const FinancePage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const { data: transactions = [], isLoading } = useCollection<Transaction>(TABLES.transactions)
  const { data: funds = [] } = useCollection<Fund>(TABLES.funds)
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)
  const [tab, setTab] = useState('transactions')

  const metrics = useMemo(() => {
    const posted = transactions.filter((t) => t.status === 'posted')
    const income = sum(posted.filter((t) => t.txn_type === 'income'), (t) => t.base_amount_minor || t.amount_minor)
    const expense = sum(posted.filter((t) => t.txn_type === 'expense'), (t) => t.base_amount_minor || t.amount_minor)
    const restricted = sum(funds.filter((f) => f.fund_type !== 'unrestricted'), (f) => f.balance_minor)
    const unrestricted = sum(funds.filter((f) => f.fund_type === 'unrestricted'), (f) => f.balance_minor)
    return { income, expense, net: income - expense, restricted, unrestricted, posted }
  }, [transactions, funds])

  const trend = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
      return { key: `${date.getFullYear()}-${date.getMonth()}`, name: MONTHS[date.getMonth()] as string }
    })
    const income = new Map<string, number>()
    const expense = new Map<string, number>()
    transactions.forEach((txn) => {
      const date = new Date(txn.txn_date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const target = txn.txn_type === 'income' ? income : expense
      target.set(key, (target.get(key) ?? 0) + toMajor(txn.base_amount_minor || txn.amount_minor))
    })
    return months.map((month) => ({
      name: month.name,
      income: Math.round(income.get(month.key) ?? 0),
      expenditure: Math.round(expense.get(month.key) ?? 0),
    }))
  }, [transactions])

  const aiContext = useMemo(
    () =>
      [
        `Finance: ${transactions.length} transactions. Posted income ${formatCurrency(metrics.income, currency)}, posted expenditure ${formatCurrency(metrics.expense, currency)}, net ${formatCurrency(metrics.net, currency)}.`,
        `Fund balances — restricted ${formatCurrency(metrics.restricted, currency)}, unrestricted ${formatCurrency(metrics.unrestricted, currency)}.`,
        ...funds.map((fund) => `Fund ${fund.name} (${fund.fund_type}): balance ${formatCurrency(fund.balance_minor, fund.currency)}.`),
        ...Object.entries(groupBy(metrics.posted.filter((t) => t.txn_type === 'expense'), (t) => t.account_code))
          .map(([code, list]) => `Expenditure on account ${code}: ${formatCurrency(sum(list, (t) => t.amount_minor), currency)} across ${list.length} entries.`)
          .slice(0, 20),
      ].join('\n'),
    [transactions.length, metrics, funds, currency],
  )

  return (
    <AppShell aiModule="finance" aiContext={aiContext}>
      <PageHeader
        title="Finance"
        subtitle="Fund accounting, income and expenditure, and the general ledger"
        icon={Wallet}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Finance' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Total income" value={formatCompactCurrency(metrics.income, currency)} icon={Banknote} hint="Posted receipts" loading={isLoading} />
        <KPICard title="Total expenditure" value={formatCompactCurrency(metrics.expense, currency)} icon={Coins} hint="Posted payments" loading={isLoading} />
        <KPICard
          title="Net position"
          value={formatCompactCurrency(metrics.net, currency)}
          icon={Activity}
          hint={metrics.net >= 0 ? 'Surplus' : 'Deficit'}
          loading={isLoading}
        />
        <KPICard
          title="Restricted funds"
          value={formatCompactCurrency(metrics.restricted, currency)}
          icon={ShieldCheck}
          hint={`Unrestricted ${formatCompactCurrency(metrics.unrestricted, currency)}`}
          loading={isLoading}
        />
      </KPICardGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Monthly income and expenditure" subtitle="Rolling twelve months" className="lg:col-span-2">
          <TrendChart
            data={trend}
            series={[
              { key: 'income', label: 'Income', color: '#22C55E' },
              { key: 'expenditure', label: 'Expenditure', color: '#7C3AED' },
            ]}
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        </ChartCard>
        <ChartCard title="Fund composition" subtitle="Restricted versus unrestricted">
          {funds.length ? (
            <DonutChart
              data={Object.entries(groupBy(funds, (fund) => titleCase(fund.fund_type))).map(([name, list]) => ({
                name,
                value: Math.round(toMajor(sum(list, (f) => f.balance_minor))),
              }))}
              formatter={(value) => formatCompactCurrency(value * 100, currency)}
            />
          ) : (
            <p className="py-12 text-center text-xs text-ink-3">No funds recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <TabBar
        tabs={[
          { key: 'transactions', label: 'Transactions', count: transactions.length },
          { key: 'funds', label: 'Funds', count: funds.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'transactions' ? (
        <DataTable<Transaction>
          data={transactions}
          loading={isLoading}
          exportName="transactions"
          exportTitle="General Ledger"
          columns={[
            { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs text-ink">{row.reference}</span> },
            { key: 'txn_date', header: 'Date', render: (row) => formatDate(row.txn_date) },
            { key: 'description', header: 'Description' },
            { key: 'account_code', header: 'Account', align: 'center' },
            {
              key: 'project',
              header: 'Project',
              value: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '',
              render: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '—',
              hideOnMobile: true,
            },
            {
              key: 'amount_minor',
              header: 'Amount',
              align: 'right',
              value: (row) => row.amount_minor,
              render: (row) => (
                <span className={row.txn_type === 'income' ? 'font-semibold text-success' : 'text-ink-2'}>
                  {row.txn_type === 'income' ? '+' : '−'}
                  {formatCurrency(row.amount_minor, row.currency)}
                </span>
              ),
            },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'type',
              label: 'Transaction type',
              options: optionsOf(['income', 'expense', 'transfer', 'adjustment', 'reversal']),
              match: (row, value) => row.txn_type === value,
            },
            {
              key: 'status',
              label: 'Status',
              options: optionsOf(['draft', 'posted', 'reversed']),
              match: (row, value) => row.status === value,
            },
          ]}
        />
      ) : (
        <DataTable<Fund>
          data={funds}
          exportName="funds"
          exportTitle="Fund Register"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Fund', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
            { key: 'fund_type', header: 'Type', render: (row) => <Badge tone={row.fund_type === 'unrestricted' ? 'success' : 'accent'}>{titleCase(row.fund_type)}</Badge> },
            {
              key: 'opening_balance_minor',
              header: 'Opening',
              align: 'right',
              value: (row) => row.opening_balance_minor,
              render: (row) => formatCurrency(row.opening_balance_minor, row.currency),
            },
            {
              key: 'balance_minor',
              header: 'Balance',
              align: 'right',
              value: (row) => row.balance_minor,
              render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.balance_minor, row.currency)}</span>,
            },
          ]}
        />
      )}
    </AppShell>
  )
}

/* ------------------------------------------------------------- Budgets */

export const BudgetsPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const { data: lines = [], isLoading } = useCollection<BudgetLine>(TABLES.budgetLines)
  const { data: projects = [] } = useCollection<Project>(TABLES.projects)

  const metrics = useMemo(() => {
    const budgeted = sum(lines, (l) => l.budgeted_minor)
    const spent = sum(lines, (l) => l.spent_minor)
    const overspent = lines.filter((l) => l.spent_minor > l.budgeted_minor)
    return { budgeted, spent, variance: budgeted - spent, overspent, utilization: percentOf(spent, budgeted) }
  }, [lines])

  const byCategory = useMemo(
    () =>
      Object.entries(groupBy(lines, (line) => line.category))
        .map(([name, list]) => ({
          name,
          budget: Math.round(toMajor(sum(list, (l) => l.budgeted_minor))),
          spent: Math.round(toMajor(sum(list, (l) => l.spent_minor))),
        }))
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 10),
    [lines],
  )

  const aiContext = useMemo(
    () =>
      [
        `Budget lines: ${lines.length}. Budgeted ${formatCurrency(metrics.budgeted, currency)}, spent ${formatCurrency(metrics.spent, currency)} (${Math.round(metrics.utilization)}% utilized). Variance ${formatCurrency(metrics.variance, currency)}.`,
        `${metrics.overspent.length} budget lines are overspent.`,
        ...byCategory.map(
          (row) =>
            `Category ${row.name}: budget ${formatCurrency(row.budget * 100, currency)}, spent ${formatCurrency(row.spent * 100, currency)}, variance ${formatCurrency((row.budget - row.spent) * 100, currency)}.`,
        ),
      ].join('\n'),
    [lines.length, metrics, byCategory, currency],
  )

  return (
    <AppShell aiModule="finance" aiContext={aiContext}>
      <PageHeader
        title="Budgets"
        subtitle="Budget versus actual by project, grant and expenditure category"
        icon={PieChart}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Budgets' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Total budgeted" value={formatCompactCurrency(metrics.budgeted, currency)} icon={Coins} loading={isLoading} />
        <KPICard title="Total spent" value={formatCompactCurrency(metrics.spent, currency)} icon={Wallet} hint={`${Math.round(metrics.utilization)}% utilized`} loading={isLoading} />
        <KPICard
          title="Remaining"
          value={formatCompactCurrency(metrics.variance, currency)}
          icon={Activity}
          hint={metrics.variance < 0 ? 'Portfolio overspent' : 'Available to spend'}
          loading={isLoading}
        />
        <KPICard
          title="Overspent lines"
          value={formatNumber(metrics.overspent.length)}
          icon={AlertTriangle}
          hint={metrics.overspent.length ? 'Require budget revision' : 'All lines within budget'}
          loading={isLoading}
        />
      </KPICardGrid>

      <ChartCard title="Budget versus actual by category" subtitle="Largest expenditure categories" className="mb-5">
        {byCategory.length ? (
          <ComparisonBars
            data={byCategory}
            series={[
              { key: 'budget', label: 'Budget' },
              { key: 'spent', label: 'Spent', color: '#22C55E' },
            ]}
            layout="vertical"
            height={320}
            formatter={(value) => formatCompactCurrency(value * 100, currency)}
          />
        ) : (
          <p className="py-12 text-center text-xs text-ink-3">No budget lines recorded yet.</p>
        )}
      </ChartCard>

      <DataTable<BudgetLine>
        data={lines}
        loading={isLoading}
        exportName="budget-lines"
        exportTitle="Budget versus Actual"
        columns={[
          { key: 'line_item', header: 'Budget line', render: (row) => <span className="font-semibold text-ink">{row.line_item}</span> },
          { key: 'category', header: 'Category' },
          {
            key: 'project',
            header: 'Project',
            value: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '',
            render: (row) => projects.find((p) => p.id === row.project_id)?.code ?? '—',
            hideOnMobile: true,
          },
          {
            key: 'budgeted_minor',
            header: 'Budget',
            align: 'right',
            value: (row) => row.budgeted_minor,
            render: (row) => formatCurrency(row.budgeted_minor, row.currency),
          },
          {
            key: 'spent_minor',
            header: 'Spent',
            align: 'right',
            value: (row) => row.spent_minor,
            render: (row) => formatCurrency(row.spent_minor, row.currency),
          },
          {
            key: 'utilization',
            header: 'Utilization',
            value: (row) => percentOf(row.spent_minor, row.budgeted_minor),
            render: (row) => {
              const used = percentOf(row.spent_minor, row.budgeted_minor)
              return (
                <ProgressBar
                  value={used}
                  showLabel
                  className="min-w-[110px]"
                  tone={used > 100 ? '#EF4444' : undefined}
                />
              )
            },
          },
          {
            key: 'variance',
            header: 'Variance',
            align: 'right',
            value: (row) => row.budgeted_minor - row.spent_minor,
            render: (row) => {
              const variance = row.budgeted_minor - row.spent_minor
              return (
                <span className={variance < 0 ? 'font-semibold text-danger' : 'text-ink-2'}>
                  {formatCurrency(variance, row.currency)}
                </span>
              )
            },
          },
        ]}
        filters={[
          {
            key: 'overspent',
            label: 'Budget health',
            options: [
              { value: 'over', label: 'Overspent' },
              { value: 'ok', label: 'Within budget' },
            ],
            match: (row, value) =>
              value === 'over' ? row.spent_minor > row.budgeted_minor : row.spent_minor <= row.budgeted_minor,
          },
        ]}
      />
    </AppShell>
  )
}

/* --------------------------------------------------------- Procurement */

export const ProcurementPage: FC = () => {
  const currency = useAppStore((state) => state.organization?.base_currency ?? 'NGN')
  const { data: requests = [], isLoading } = useCollection<PurchaseRequest>(TABLES.purchaseRequests)
  const { data: orders = [] } = useCollection<PurchaseOrder>(TABLES.purchaseOrders)
  const [tab, setTab] = useState('requests')

  const metrics = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending_approval').length,
      approved: requests.filter((r) => ['approved', 'ordered', 'received', 'closed'].includes(r.status)).length,
      value: sum(requests, (r) => r.estimated_minor),
      ordered: sum(orders, (o) => o.total_minor),
    }),
    [requests, orders],
  )

  const aiContext = useMemo(
    () =>
      [
        `Procurement: ${requests.length} requests worth ${formatCurrency(metrics.value, currency)}. ${metrics.pending} awaiting approval. ${orders.length} purchase orders totalling ${formatCurrency(metrics.ordered, currency)}.`,
        ...requests
          .slice(0, 40)
          .map((r) => `${r.reference} — ${r.title}, estimated ${formatCurrency(r.estimated_minor, r.currency)}, status ${r.status}, needed by ${formatDate(r.needed_by)}.`),
      ].join('\n'),
    [requests, orders.length, metrics, currency],
  )

  return (
    <AppShell aiModule="procurement" aiContext={aiContext}>
      <PageHeader
        title="Procurement"
        subtitle="Requisitions, quotations, approvals and purchase orders"
        icon={ShoppingCart}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Procurement' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Requests" value={formatNumber(requests.length)} icon={ShoppingCart} hint={`${metrics.approved} approved`} loading={isLoading} />
        <KPICard title="Awaiting approval" value={formatNumber(metrics.pending)} icon={AlertTriangle} loading={isLoading} />
        <KPICard title="Requested value" value={formatCompactCurrency(metrics.value, currency)} icon={Coins} loading={isLoading} />
        <KPICard title="Ordered value" value={formatCompactCurrency(metrics.ordered, currency)} icon={Package} hint={`${orders.length} purchase orders`} loading={isLoading} />
      </KPICardGrid>

      <TabBar
        tabs={[
          { key: 'requests', label: 'Purchase requests', count: requests.length },
          { key: 'orders', label: 'Purchase orders', count: orders.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'requests' ? (
        <DataTable<PurchaseRequest>
          data={requests}
          loading={isLoading}
          exportName="purchase-requests"
          exportTitle="Purchase Requests"
          columns={[
            { key: 'reference', header: 'Reference', render: (row) => <span className="font-mono text-xs text-ink">{row.reference}</span> },
            { key: 'title', header: 'Description', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            { key: 'request_date', header: 'Requested', render: (row) => formatDate(row.request_date) },
            { key: 'needed_by', header: 'Needed by', render: (row) => formatDate(row.needed_by) },
            {
              key: 'estimated_minor',
              header: 'Estimated',
              align: 'right',
              value: (row) => row.estimated_minor,
              render: (row) => formatCurrency(row.estimated_minor, row.currency),
            },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: optionsOf(['draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received', 'closed']),
              match: (row, value) => row.status === value,
            },
          ]}
        />
      ) : (
        <DataTable<PurchaseOrder>
          data={orders}
          exportName="purchase-orders"
          exportTitle="Purchase Orders"
          columns={[
            { key: 'reference', header: 'PO number', render: (row) => <span className="font-mono text-xs text-ink">{row.reference}</span> },
            { key: 'order_date', header: 'Ordered', render: (row) => formatDate(row.order_date) },
            { key: 'expected_date', header: 'Expected', render: (row) => formatDate(row.expected_date) },
            { key: 'received_date', header: 'Received', render: (row) => formatDate(row.received_date) },
            {
              key: 'total_minor',
              header: 'Total',
              align: 'right',
              value: (row) => row.total_minor,
              render: (row) => formatCurrency(row.total_minor, row.currency),
            },
            { key: 'invoice_ref', header: 'Invoice', hideOnMobile: true },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
        />
      )}
    </AppShell>
  )
}

/* --------------------------------------------------------- Inventory */

export const InventoryPage: FC = () => (
  <ModulePage<InventoryItem>
    title="Inventory"
    subtitle="Programme supplies, stock levels, reorder points and expiry tracking"
    icon={Package}
    aiModule="inventory"
    table={TABLES.inventory}
    recordLabel="Item"
    moneyFields={['unit_cost_minor']}
    columns={[
      { key: 'name', header: 'Item', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: 'sku', header: 'SKU' },
      { key: 'category', header: 'Category' },
      { key: 'quantity', header: 'On hand', align: 'right', render: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
      { key: 'reorder_level', header: 'Reorder at', align: 'right', render: (row) => formatNumber(row.reorder_level) },
      {
        key: 'unit_cost_minor',
        header: 'Unit cost',
        align: 'right',
        value: (row) => row.unit_cost_minor,
        render: (row) => formatCurrency(row.unit_cost_minor, row.currency),
      },
      { key: 'expiry_date', header: 'Expires', render: (row) => formatDate(row.expiry_date) },
      {
        key: 'stock_status',
        header: 'Stock',
        sortable: false,
        render: (row) => (
          <Badge tone={row.quantity === 0 ? 'danger' : row.quantity <= row.reorder_level ? 'warning' : 'success'}>
            {row.quantity === 0 ? 'Out of stock' : row.quantity <= row.reorder_level ? 'Reorder' : 'In stock'}
          </Badge>
        ),
      },
    ]}
    filters={[
      {
        key: 'stock',
        label: 'Stock status',
        options: [
          { value: 'out', label: 'Out of stock' },
          { value: 'low', label: 'At or below reorder level' },
          { value: 'ok', label: 'In stock' },
        ],
        match: (row, value) =>
          value === 'out' ? row.quantity === 0 : value === 'low' ? row.quantity <= row.reorder_level : row.quantity > row.reorder_level,
      },
    ]}
    fields={[
      { name: 'name', label: 'Item name', type: 'text', required: true, full: true },
      { name: 'sku', label: 'SKU', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text', required: true },
      { name: 'unit', label: 'Unit of measure', type: 'text', required: true, placeholder: 'piece, carton, kg' },
      { name: 'quantity', label: 'Quantity on hand', type: 'number' },
      { name: 'reorder_level', label: 'Reorder level', type: 'number' },
      { name: 'unit_cost_minor', label: 'Unit cost', type: 'money' },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
      { name: 'is_consumable', label: 'Consumable item', type: 'checkbox', defaultValue: true },
    ]}
    kpis={(rows, currency) => [
      { label: 'Line items', value: formatNumber(rows.length), icon: Package },
      {
        label: 'Stock value',
        value: formatCompactCurrency(sum(rows, (r) => r.quantity * r.unit_cost_minor), currency),
        icon: Coins,
      },
      {
        label: 'Below reorder level',
        value: formatNumber(rows.filter((r) => r.quantity <= r.reorder_level).length),
        icon: AlertTriangle,
      },
      {
        label: 'Expiring in 90 days',
        value: formatNumber(
          rows.filter((r) => r.expiry_date && daysBetween(new Date(), r.expiry_date) >= 0 && daysBetween(new Date(), r.expiry_date) <= 90).length,
        ),
        icon: Activity,
      },
    ]}
    aiContext={(rows, currency) =>
      [
        `Inventory: ${rows.length} line items worth ${formatCurrency(sum(rows, (r) => r.quantity * r.unit_cost_minor), currency)}.`,
        `${rows.filter((r) => r.quantity <= r.reorder_level).length} items at or below reorder level.`,
        ...rows.slice(0, 50).map((r) => `${r.name} (${r.sku}) — ${r.quantity} ${r.unit} on hand, reorder at ${r.reorder_level}.`),
      ].join('\n')
    }
  />
)

/* ------------------------------------------------------------- Assets */

export const AssetsPage: FC = () => (
  <ModulePage<Asset>
    title="Assets"
    subtitle="Fixed asset register with custody, condition and donor attribution"
    icon={Boxes}
    aiModule="assets"
    table={TABLES.assets}
    recordLabel="Asset"
    moneyFields={['purchase_cost_minor']}
    columns={[
      { key: 'name', header: 'Asset', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: 'tag', header: 'Tag' },
      { key: 'category', header: 'Category', render: (row) => titleCase(row.category) },
      { key: 'serial_number', header: 'Serial', hideOnMobile: true },
      { key: 'location', header: 'Location' },
      {
        key: 'purchase_cost_minor',
        header: 'Cost',
        align: 'right',
        value: (row) => row.purchase_cost_minor,
        render: (row) => formatCurrency(row.purchase_cost_minor, row.currency),
      },
      { key: 'condition', header: 'Condition', render: (row) => <Badge tone={row.condition === 'unserviceable' ? 'danger' : row.condition === 'poor' ? 'warning' : 'success'}>{titleCase(row.condition)}</Badge> },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'category',
        label: 'Category',
        options: optionsOf(['vehicle', 'equipment', 'computer', 'medical', 'furniture', 'other']),
        match: (row, value) => row.category === value,
      },
      {
        key: 'status',
        label: 'Status',
        options: optionsOf(['in_use', 'in_store', 'maintenance', 'disposed', 'lost']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'name', label: 'Asset name', type: 'text', required: true, full: true },
      { name: 'tag', label: 'Asset tag', type: 'text', required: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: optionsOf(['vehicle', 'equipment', 'computer', 'medical', 'furniture', 'other']),
      },
      { name: 'serial_number', label: 'Serial number', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'purchase_date', label: 'Purchase date', type: 'date' },
      { name: 'purchase_cost_minor', label: 'Purchase cost', type: 'money' },
      { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'NGN' },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'good',
        options: optionsOf(['new', 'good', 'fair', 'poor', 'unserviceable']),
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'in_use',
        options: optionsOf(['in_use', 'in_store', 'maintenance', 'disposed', 'lost']),
      },
      { name: 'next_maintenance', label: 'Next maintenance', type: 'date' },
    ]}
    kpis={(rows, currency) => [
      { label: 'Assets', value: formatNumber(rows.length), icon: Boxes, hint: `${rows.filter((r) => r.status === 'in_use').length} in use` },
      { label: 'Asset value', value: formatCompactCurrency(sum(rows, (r) => r.purchase_cost_minor), currency), icon: Coins },
      { label: 'In maintenance', value: formatNumber(rows.filter((r) => r.status === 'maintenance').length), icon: Activity },
      {
        label: 'Poor condition',
        value: formatNumber(rows.filter((r) => ['poor', 'unserviceable'].includes(r.condition)).length),
        icon: AlertTriangle,
      },
    ]}
    aiContext={(rows, currency) =>
      [
        `Assets: ${rows.length} on the register worth ${formatCurrency(sum(rows, (r) => r.purchase_cost_minor), currency)}.`,
        ...rows.slice(0, 50).map((r) => `${r.tag} — ${r.name} (${r.category}), ${r.location ?? 'unassigned'}, condition ${r.condition}, status ${r.status}.`),
      ].join('\n')
    }
  />
)

/* -------------------------------------------------------------- Fleet */

export const FleetPage: FC = () => (
  <ModulePage<Vehicle>
    title="Fleet"
    subtitle="Vehicles, drivers, documentation expiry and maintenance schedules"
    icon={Truck}
    aiModule="fleet"
    table={TABLES.vehicles}
    recordLabel="Vehicle"
    columns={[
      { key: 'plate_number', header: 'Plate', render: (row) => <span className="font-mono font-semibold text-ink">{row.plate_number}</span> },
      { key: 'make', header: 'Make', render: (row) => `${row.make} ${row.model}` },
      { key: 'year', header: 'Year', align: 'center' },
      { key: 'vehicle_type', header: 'Type' },
      { key: 'odometer_km', header: 'Odometer', align: 'right', render: (row) => `${formatNumber(row.odometer_km)} km` },
      {
        key: 'insurance_expiry',
        header: 'Insurance',
        render: (row) => {
          const days = row.insurance_expiry ? daysBetween(new Date(), row.insurance_expiry) : null
          return (
            <span className={days !== null && days < 30 ? 'font-semibold text-danger' : 'text-ink-2'}>
              {formatDate(row.insurance_expiry)}
            </span>
          )
        },
      },
      { key: 'location', header: 'Location', hideOnMobile: true },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'status',
        label: 'Status',
        options: optionsOf(['available', 'on_trip', 'maintenance', 'grounded']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'plate_number', label: 'Plate number', type: 'text', required: true },
      { name: 'vehicle_type', label: 'Vehicle type', type: 'text', required: true },
      { name: 'make', label: 'Make', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'fuel_type', label: 'Fuel type', type: 'select', options: optionsOf(['Diesel', 'Petrol', 'Electric', 'Hybrid']) },
      { name: 'odometer_km', label: 'Odometer (km)', type: 'number' },
      { name: 'insurance_expiry', label: 'Insurance expiry', type: 'date' },
      { name: 'registration_expiry', label: 'Registration expiry', type: 'date' },
      { name: 'location', label: 'Current location', type: 'text' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'available',
        options: optionsOf(['available', 'on_trip', 'maintenance', 'grounded']),
      },
    ]}
    kpis={(rows) => [
      { label: 'Vehicles', value: formatNumber(rows.length), icon: Truck, hint: `${rows.filter((r) => r.status === 'available').length} available` },
      { label: 'On trip', value: formatNumber(rows.filter((r) => r.status === 'on_trip').length), icon: Activity },
      { label: 'In maintenance', value: formatNumber(rows.filter((r) => r.status === 'maintenance').length), icon: AlertTriangle },
      {
        label: 'Documents expiring',
        value: formatNumber(
          rows.filter(
            (r) =>
              (r.insurance_expiry && daysBetween(new Date(), r.insurance_expiry) < 30) ||
              (r.registration_expiry && daysBetween(new Date(), r.registration_expiry) < 30),
          ).length,
        ),
        icon: ShieldCheck,
        hint: 'Within 30 days',
      },
    ]}
    aiContext={(rows) =>
      [
        `Fleet: ${rows.length} vehicles, ${rows.filter((r) => r.status === 'available').length} available.`,
        ...rows.map(
          (r) =>
            `${r.plate_number} — ${r.make} ${r.model} (${r.year ?? 'year unknown'}), ${formatNumber(r.odometer_km)} km, status ${r.status}, insurance expires ${formatDate(r.insurance_expiry)}.`,
        ),
      ].join('\n')
    }
  />
)

/* --------------------------------------------------------- Compliance */

export const CompliancePage: FC = () => (
  <ModulePage<ComplianceItem>
    title="Compliance"
    subtitle="Statutory registrations, licences, certifications and the compliance calendar"
    icon={ShieldCheck}
    aiModule="compliance"
    table={TABLES.compliance}
    recordLabel="Compliance item"
    columns={[
      { key: 'title', header: 'Requirement', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { key: 'category', header: 'Category', render: (row) => titleCase(row.category) },
      { key: 'authority', header: 'Authority' },
      { key: 'reference_number', header: 'Reference', hideOnMobile: true },
      { key: 'issue_date', header: 'Issued', render: (row) => formatDate(row.issue_date) },
      {
        key: 'expiry_date',
        header: 'Expires',
        render: (row) => {
          const days = row.expiry_date ? daysBetween(new Date(), row.expiry_date) : null
          return (
            <span className={days !== null && days < 60 ? 'font-semibold text-danger' : 'text-ink-2'}>
              {formatDate(row.expiry_date)}
            </span>
          )
        },
      },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'status',
        label: 'Status',
        options: optionsOf(['valid', 'due_soon', 'expired', 'in_progress']),
        match: (row, value) => row.status === value,
      },
      {
        key: 'category',
        label: 'Category',
        options: optionsOf(['registration', 'tax', 'license', 'certification', 'donor', 'statutory', 'audit']),
        match: (row, value) => row.category === value,
      },
    ]}
    fields={[
      { name: 'title', label: 'Requirement', type: 'text', required: true, full: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: optionsOf(['registration', 'tax', 'license', 'certification', 'donor', 'statutory', 'audit']),
      },
      { name: 'authority', label: 'Issuing authority', type: 'text' },
      { name: 'reference_number', label: 'Reference number', type: 'text' },
      { name: 'issue_date', label: 'Issue date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        defaultValue: 'valid',
        options: optionsOf(['valid', 'due_soon', 'expired', 'in_progress']),
      },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ]}
    kpis={(rows) => [
      { label: 'Requirements tracked', value: formatNumber(rows.length), icon: ShieldCheck },
      { label: 'Valid', value: formatNumber(rows.filter((r) => r.status === 'valid').length), icon: Landmark },
      { label: 'Due soon', value: formatNumber(rows.filter((r) => r.status === 'due_soon').length), icon: Activity },
      { label: 'Expired', value: formatNumber(rows.filter((r) => r.status === 'expired').length), icon: AlertTriangle },
    ]}
    aiContext={(rows) =>
      [
        `Compliance: ${rows.length} statutory requirements tracked. ${rows.filter((r) => r.status === 'expired').length} expired, ${rows.filter((r) => r.status === 'due_soon').length} due soon.`,
        ...rows.map((r) => `${r.title} (${r.authority ?? 'unspecified authority'}) — status ${r.status}, expires ${formatDate(r.expiry_date)}.`),
      ].join('\n')
    }
  />
)

/* ------------------------------------------------------------- Risks */

export const RisksPage: FC = () => (
  <ModulePage<ProjectRisk>
    title="Risk Register"
    subtitle="Project and organizational risks with likelihood, impact and mitigation"
    icon={AlertTriangle}
    aiModule="risks"
    table={TABLES.projectRisks}
    recordLabel="Risk"
    columns={[
      { key: 'title', header: 'Risk', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
      { key: 'category', header: 'Category' },
      {
        key: 'register_type',
        header: 'Register',
        render: (row) => <Badge tone="neutral">{titleCase(row.register_type)}</Badge>,
      },
      {
        key: 'likelihood',
        header: 'Likelihood',
        render: (row) => <Badge tone={row.likelihood === 'high' ? 'danger' : row.likelihood === 'medium' ? 'warning' : 'success'}>{titleCase(row.likelihood)}</Badge>,
      },
      {
        key: 'impact',
        header: 'Impact',
        render: (row) => <Badge tone={row.impact === 'high' ? 'danger' : row.impact === 'medium' ? 'warning' : 'success'}>{titleCase(row.impact)}</Badge>,
      },
      { key: 'mitigation', header: 'Mitigation', hideOnMobile: true, render: (row) => <span className="text-xs">{row.mitigation ?? '—'}</span> },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    ]}
    filters={[
      {
        key: 'register',
        label: 'Register',
        options: optionsOf(['project', 'organizational']),
        match: (row, value) => row.register_type === value,
      },
      {
        key: 'status',
        label: 'Status',
        options: optionsOf(['open', 'mitigating', 'closed']),
        match: (row, value) => row.status === value,
      },
    ]}
    fields={[
      { name: 'title', label: 'Risk description', type: 'text', required: true, full: true },
      { name: 'category', label: 'Category', type: 'text', required: true },
      {
        name: 'register_type',
        label: 'Register',
        type: 'select',
        required: true,
        defaultValue: 'project',
        options: optionsOf(['project', 'organizational']),
      },
      { name: 'likelihood', label: 'Likelihood', type: 'select', defaultValue: 'medium', options: optionsOf(['low', 'medium', 'high']) },
      { name: 'impact', label: 'Impact', type: 'select', defaultValue: 'medium', options: optionsOf(['low', 'medium', 'high']) },
      { name: 'mitigation', label: 'Mitigation measures', type: 'textarea', full: true },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'open', options: optionsOf(['open', 'mitigating', 'closed']) },
      { name: 'description', label: 'Detail', type: 'textarea', full: true },
    ]}
    kpis={(rows) => [
      { label: 'Risks logged', value: formatNumber(rows.length), icon: AlertTriangle },
      {
        label: 'High exposure',
        value: formatNumber(rows.filter((r) => r.likelihood === 'high' && r.impact === 'high').length),
        icon: Activity,
        hint: 'High likelihood and impact',
      },
      { label: 'Being mitigated', value: formatNumber(rows.filter((r) => r.status === 'mitigating').length), icon: ShieldCheck },
      { label: 'Closed', value: formatNumber(rows.filter((r) => r.status === 'closed').length), icon: Landmark },
    ]}
    aiContext={(rows) =>
      [
        `Risk register: ${rows.length} risks. ${rows.filter((r) => r.likelihood === 'high' && r.impact === 'high').length} rated high likelihood and high impact.`,
        ...rows.map(
          (r) => `${r.title} (${r.category}, ${r.register_type}) — likelihood ${r.likelihood}, impact ${r.impact}, status ${r.status}. Mitigation: ${r.mitigation ?? 'none recorded'}.`,
        ),
      ].join('\n')
    }
  />
)

/* -------------------------------------------------------- Governance */

export const GovernancePage: FC = () => {
  const { data: meetings = [], isLoading } = useCollection<BoardMeeting>(TABLES.meetings)
  const { data: policies = [] } = useCollection<Policy>(TABLES.policies)
  const [tab, setTab] = useState('meetings')

  const aiContext = useMemo(
    () =>
      [
        `Governance: ${meetings.length} board and management meetings recorded, ${policies.length} policies on file.`,
        ...meetings.map((m) => `${m.title} on ${formatDate(m.meeting_date)} — ${m.attendees_count} attendees, quorum ${m.quorum_met ? 'met' : 'not met'}, status ${m.status}.`),
        ...policies.map((p) => `Policy: ${p.title} ${p.version}, ${p.status}, effective ${formatDate(p.effective_date)}, review due ${formatDate(p.review_date)}.`),
      ].join('\n'),
    [meetings, policies],
  )

  return (
    <AppShell aiModule="governance" aiContext={aiContext}>
      <PageHeader
        title="Governance"
        subtitle="Board meetings, resolutions and organizational policies"
        icon={Landmark}
        breadcrumb={[{ label: 'Workspace', href: '/app' }, { label: 'Governance' }]}
      />

      <KPICardGrid className="mb-5">
        <KPICard title="Meetings held" value={formatNumber(meetings.filter((m) => m.status === 'held').length)} icon={Landmark} loading={isLoading} />
        <KPICard title="Scheduled" value={formatNumber(meetings.filter((m) => m.status === 'scheduled').length)} icon={Building} loading={isLoading} />
        <KPICard title="Active policies" value={formatNumber(policies.filter((p) => p.status === 'active').length)} icon={ShieldCheck} loading={isLoading} />
        <KPICard
          title="Policies under review"
          value={formatNumber(policies.filter((p) => p.status === 'under_review').length)}
          icon={Activity}
          loading={isLoading}
        />
      </KPICardGrid>

      <TabBar
        tabs={[
          { key: 'meetings', label: 'Meetings', count: meetings.length },
          { key: 'policies', label: 'Policies', count: policies.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'meetings' ? (
        <DataTable<BoardMeeting>
          data={meetings}
          loading={isLoading}
          exportName="board-meetings"
          exportTitle="Board and Management Meetings"
          columns={[
            { key: 'title', header: 'Meeting', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            { key: 'meeting_type', header: 'Type', render: (row) => titleCase(row.meeting_type) },
            { key: 'meeting_date', header: 'Date', render: (row) => formatDate(row.meeting_date) },
            { key: 'chairperson', header: 'Chair', hideOnMobile: true },
            { key: 'attendees_count', header: 'Attendees', align: 'right' },
            {
              key: 'quorum_met',
              header: 'Quorum',
              render: (row) => <Badge tone={row.quorum_met ? 'success' : 'danger'}>{row.quorum_met ? 'Met' : 'Not met'}</Badge>,
            },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
        />
      ) : (
        <DataTable<Policy>
          data={policies}
          exportName="policies"
          exportTitle="Organizational Policies"
          columns={[
            { key: 'title', header: 'Policy', render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
            { key: 'category', header: 'Category' },
            { key: 'version', header: 'Version', align: 'center' },
            { key: 'effective_date', header: 'Effective', render: (row) => formatDate(row.effective_date) },
            { key: 'review_date', header: 'Review due', render: (row) => formatDate(row.review_date) },
            { key: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
          ]}
        />
      )}
    </AppShell>
  )
}
