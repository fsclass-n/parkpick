import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUS } from '../lib/config'

const axis = { fontSize: 12, fill: '#94a3b8' }
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }

export function HourlyTrafficChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="hour" tick={axis} tickFormatter={(h) => `${h}시`} />
        <YAxis yAxisId="l" tick={axis} />
        <YAxis yAxisId="r" orientation="right" tick={axis} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => (name === '혼잡도' ? `${(v * 100).toFixed(1)}%` : `${v}대`)} labelFormatter={(h) => `${h}시`} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="l" dataKey="entries" name="입차" fill="#3a6cf0" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="l" dataKey="exits" name="출차" fill="#bcd1ff" radius={[4, 4, 0, 0]} />
        <Line yAxisId="r" dataKey="congestion" name="혼잡도" stroke={STATUS.alert.color} strokeWidth={2.5} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function DailyTurnoverChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
        <YAxis yAxisId="l" tick={axis} />
        <YAxis yAxisId="r" orientation="right" tick={axis} tickFormatter={(v) => `${v}회`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => (name === '회전율' ? `${v}회` : `${v}대`)} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="l" dataKey="entries" name="입차 대수" fill="#3a6cf0" radius={[4, 4, 0, 0]} barSize={36} />
        <Line yAxisId="r" dataKey="turnover" name="회전율" stroke="#16a34a" strokeWidth={2.5} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function OccupancyDonut({ occupied, empty }) {
  const data = [
    { name: '점유', value: occupied, color: STATUS.occupied.color },
    { name: '빈 자리', value: empty, color: STATUS.empty.color },
  ]
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" isAnimationActive={false} cy="45%" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}면`} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ClassAccuracyChart({ classes }) {
  const data = Object.entries(classes || {}).map(([name, value]) => ({ name, value }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" domain={[0, 1]} tick={axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
        <YAxis type="category" dataKey="name" tick={axis} width={80} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${(v * 100).toFixed(1)}%`} />
        <Bar dataKey="value" name="AP50" fill="#2459e0" radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
