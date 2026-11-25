// 주차 유도 전광판(LED 사인) — 실제 주차장 입구 안내판을 모티브로 한 parkpick 시그니처 컴포넌트
// rows: [{ label, value, total, icon }] · value 0 이면 FULL(적색) 표시
const DOTS = { backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.2px)', backgroundSize: '4px 4px' }

export default function LedSign({ title = 'PARKING GUIDANCE', rows = [], footer, className = '' }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 p-1.5 shadow-2xl shadow-black/50 ${className}`}>
      <div className="relative overflow-hidden rounded-xl border border-black bg-black px-5 py-4" style={DOTS}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[11px] font-bold tracking-[0.2em] text-sign-400">
          <span><i className="fa-solid fa-square-parking mr-2" />{title}</span>
          <span className="flex items-center gap-1.5 text-led"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-led" />LIVE</span>
        </div>
        <ul className="divide-y divide-white/5">
          {rows.map((r) => {
            const full = r.value === 0
            return (
              <li key={r.label} className="flex items-center gap-4 py-3">
                <span className="grid h-9 w-12 place-items-center rounded-md bg-white/10 font-mono text-sm font-extrabold text-white">{r.label}</span>
                <i className={`fa-solid ${r.icon || 'fa-arrow-right'} text-sm ${full ? 'text-red-500' : 'text-sign-400'}`} />
                <span className="flex-1 truncate text-[13px] text-slate-400">{r.caption}</span>
                <span className={`font-mono text-[30px] font-extrabold leading-none tabular-nums ${full ? 'text-red-500' : 'text-led'}`}
                  style={{ textShadow: `0 0 12px ${full ? 'rgba(239,68,68,.65)' : 'rgba(52,245,161,.55)'}` }}>
                  {r.value == null ? '---' : full ? 'FULL' : String(r.value).padStart(3, '0')}
                </span>
              </li>
            )
          })}
        </ul>
        {footer && <p className="mt-1 border-t border-white/10 pt-3 font-mono text-[11px] tracking-wider text-slate-500">{footer}</p>}
      </div>
    </div>
  )
}
