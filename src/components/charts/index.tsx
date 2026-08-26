import { type FC } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS } from '@/constants'

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--accent-border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
}

const axisProps = {
  stroke: 'var(--text-muted)',
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
}

export interface SeriesPoint {
  name: string
  [key: string]: string | number
}

interface BaseChartProps {
  data: SeriesPoint[]
  height?: number
  formatter?: (value: number) => string
}

export const TrendChart: FC<
  BaseChartProps & { series: { key: string; label: string; color?: string }[]; stacked?: boolean }
> = ({ data, series, height = 260, formatter, stacked }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
      <defs>
        {series.map((item, index) => (
          <linearGradient key={item.key} id={`grad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.45} />
            <stop offset="100%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} tickFormatter={(value: number) => (formatter ? formatter(value) : String(value))} />
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(value: number) => (formatter ? formatter(value) : value.toLocaleString())}
      />
      {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} /> : null}
      {series.map((item, index) => (
        <Area
          key={item.key}
          type="monotone"
          dataKey={item.key}
          name={item.label}
          stackId={stacked ? 'stack' : undefined}
          stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
          strokeWidth={2}
          fill={`url(#grad-${item.key})`}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
)

export const ComparisonBars: FC<
  BaseChartProps & { series: { key: string; label: string; color?: string }[]; layout?: 'vertical' | 'horizontal' }
> = ({ data, series, height = 260, formatter, layout = 'horizontal' }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart
      data={data}
      layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
      margin={{ top: 6, right: 10, left: layout === 'vertical' ? 10 : -18, bottom: 0 }}
      barGap={4}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={layout === 'vertical'} horizontal={layout !== 'vertical'} />
      {layout === 'vertical' ? (
        <>
          <XAxis type="number" {...axisProps} tickFormatter={(value: number) => (formatter ? formatter(value) : String(value))} />
          <YAxis type="category" dataKey="name" width={130} {...axisProps} />
        </>
      ) : (
        <>
          <XAxis dataKey="name" {...axisProps} interval={0} angle={data.length > 7 ? -25 : 0} textAnchor={data.length > 7 ? 'end' : 'middle'} height={data.length > 7 ? 56 : 30} />
          <YAxis {...axisProps} tickFormatter={(value: number) => (formatter ? formatter(value) : String(value))} />
        </>
      )}
      <Tooltip
        cursor={{ fill: 'var(--accent-glow)' }}
        contentStyle={tooltipStyle}
        formatter={(value: number) => (formatter ? formatter(value) : value.toLocaleString())}
      />
      {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} /> : null}
      {series.map((item, index) => (
        <Bar
          key={item.key}
          dataKey={item.key}
          name={item.label}
          fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
          radius={layout === 'vertical' ? [0, 6, 6, 0] : [6, 6, 0, 0]}
          maxBarSize={44}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
)

export const DonutChart: FC<{
  data: { name: string; value: number }[]
  height?: number
  formatter?: (value: number) => string
  innerRadius?: number
  colors?: readonly string[]
}> = ({ data, height = 260, formatter, innerRadius = 58, colors = CHART_COLORS }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        innerRadius={innerRadius}
        outerRadius={innerRadius + 34}
        paddingAngle={2}
        stroke="none"
      >
        {data.map((entry, index) => (
          <Cell key={entry.name} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(value: number) => (formatter ? formatter(value) : value.toLocaleString())}
      />
      <Legend
        wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
        iconType="circle"
        iconSize={8}
      />
    </PieChart>
  </ResponsiveContainer>
)

export const ProgressLine: FC<
  BaseChartProps & { series: { key: string; label: string; color?: string; dashed?: boolean }[] }
> = ({ data, series, height = 260, formatter }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} tickFormatter={(value: number) => (formatter ? formatter(value) : String(value))} />
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(value: number) => (formatter ? formatter(value) : value.toLocaleString())}
      />
      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
      {series.map((item, index) => (
        <Line
          key={item.key}
          type="monotone"
          dataKey={item.key}
          name={item.label}
          stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
          strokeWidth={2}
          strokeDasharray={item.dashed ? '5 4' : undefined}
          dot={false}
          activeDot={{ r: 4 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
)

export const PipelineFunnel: FC<{
  data: { name: string; value: number; fill?: string }[]
  height?: number
  formatter?: (value: number) => string
}> = ({ data, height = 280, formatter }) => (
  <ResponsiveContainer width="100%" height={height}>
    <FunnelChart>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(value: number) => (formatter ? formatter(value) : value.toLocaleString())}
      />
      <Funnel dataKey="value" data={data} isAnimationActive stroke="none">
        {data.map((entry, index) => (
          <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
        <LabelList
          position="right"
          dataKey="name"
          fill="var(--text-secondary)"
          stroke="none"
          fontSize={11}
        />
      </Funnel>
    </FunnelChart>
  </ResponsiveContainer>
)

export const PerformanceRadar: FC<{
  data: { subject: string; value: number; target: number }[]
  height?: number
}> = ({ data, height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadarChart data={data} outerRadius="72%">
      <PolarGrid stroke="var(--bg-border)" />
      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
      <Radar name="Target" dataKey="target" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.12} />
      <Radar name="Actual" dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.42} />
      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
      <Tooltip contentStyle={tooltipStyle} />
    </RadarChart>
  </ResponsiveContainer>
)
