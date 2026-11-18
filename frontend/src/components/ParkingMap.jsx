import { STATUS } from '../lib/config'

const KIND_ICON = { disabled: '\uf193', ev: '\uf0e7', reserved: '\uf274' } // FontAwesome: wheelchair, bolt, calendar-check

export function spaceColor(space) {
  if (space.kind === 'reserved') return STATUS.reserved.color
  if (space.status === 'occupied') return STATUS.occupied.color
  return STATUS[space.kind === 'normal' ? 'empty' : space.kind].color
}

/**
 * 층별 주차면 맵 (SVG). backend/app/services/layout.py 좌표계를 그대로 사용합니다.
 * - highlight: 추천/내 차 주차면 코드
 * - route: 입구 → 주차면 유도 경로 포인트
 * - alerts: 이상 이벤트가 발생한 주차면 코드 Set (오렌지 점멸)
 */
export default function ParkingMap({ spaces, map, entrance, highlight, route, alerts, onSelect }) {
  const { width = 960, height = 580, space_w: w = 50, space_h: h = 80 } = map || {}
  const path = route?.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <div className="overflow-x-auto rounded-xl bg-slate-100 p-2 dark:bg-slate-950">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full select-none" role="img" aria-label="주차면 현황 맵">
        <rect x="0" y="0" width={width} height={height} rx="14" className="fill-white dark:fill-slate-900" />
        {/* 통로 */}
        <rect x="70" y="130" width="40" height="320" className="fill-slate-200 dark:fill-slate-800" />
        <rect x="70" y="130" width={width - 90} height="60" rx="6" className="fill-slate-200 dark:fill-slate-800" />
        <rect x="70" y="390" width={width - 90} height="60" rx="6" className="fill-slate-200 dark:fill-slate-800" />
        {[160, 420].map((y) => (
          <line key={y} x1="120" x2={width - 40} y1={y} y2={y} strokeDasharray="14 12" strokeWidth="2" className="stroke-slate-300 dark:stroke-slate-600" />
        ))}
        {/* 입구 */}
        <g>
          <rect x="4" y={(entrance?.y ?? 160) - 26} width="62" height="52" rx="10" className="fill-brand-600" />
          <text x="35" y={(entrance?.y ?? 160) + 5} textAnchor="middle" className="fill-white text-[15px] font-bold">IN</text>
        </g>
        {/* 유도 경로 */}
        {path && (
          <polyline points={path} fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-500" strokeDasharray="12 8">
            <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
          </polyline>
        )}
        {spaces.map((s) => {
          const color = spaceColor(s)
          const isHighlight = s.code === highlight
          const isAlert = alerts?.has(s.code)
          return (
            <g key={s.code} onClick={() => onSelect?.(s)} className={onSelect ? 'cursor-pointer' : ''}>
              <title>{`${s.code} · ${STATUS[s.status === 'occupied' ? 'occupied' : 'empty'].label}${s.kind !== 'normal' ? ` · ${STATUS[s.kind].label}` : ''}`}</title>
              <rect x={s.x} y={s.y} width={w} height={h} rx="6" fill={color} fillOpacity={s.status === 'occupied' ? 0.9 : 0.22}
                stroke={isAlert ? STATUS.alert.color : color} strokeWidth={isAlert ? 4 : 2} className={isAlert ? 'animate-blink' : ''} />
              {s.status === 'occupied' && <rect x={s.x + 9} y={s.y + 14} width={w - 18} height={h - 28} rx="8" className="fill-white/25" />}
              {KIND_ICON[s.kind] && (
                <text x={s.x + w / 2} y={s.y + h / 2 + 6} textAnchor="middle" fill={s.status === 'occupied' ? '#fff' : color}
                  style={{ fontFamily: '"Font Awesome 7 Free"', fontWeight: 900, fontSize: 17 }}>{KIND_ICON[s.kind]}</text>
              )}
              <text x={s.x + w / 2} y={s.zone === 'A' || s.zone === 'C' ? s.y - 6 : s.y + h + 14} textAnchor="middle"
                className="fill-slate-500 text-[11px] font-medium dark:fill-slate-400">{s.code.slice(3)}</text>
              {isHighlight && (
                <rect x={s.x - 5} y={s.y - 5} width={w + 10} height={h + 10} rx="9" fill="none" strokeWidth="4" className="stroke-brand-600 dark:stroke-brand-400">
                  <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                </rect>
              )}
            </g>
          )
        })}
        {['A', 'B', 'C', 'D'].map((zone, i) => (
          <text key={zone} x={width - 22} y={[80, 240, 340, 500][i]} textAnchor="middle" className="fill-slate-400 text-[18px] font-bold">{zone}</text>
        ))}
      </svg>
    </div>
  )
}
