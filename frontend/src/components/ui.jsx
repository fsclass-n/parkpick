import { Link } from 'react-router-dom'
import { STATUS } from '../lib/config'
import { unsplash } from '../lib/images'

/**
 * 서브 페이지 공통 히어로 배너 (Unsplash 이미지 + 관제 그리드 + 노면 해저드 스트라이프)
 * image: lib/images.js 의 키 · children: 우측 액션 영역
 */
export function PageHero({ image = 'garageCars', eyebrow, icon, title, desc, children }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <img src={unsplash(image, 1920)} alt="" aria-hidden className="img-cover absolute inset-0 -z-20 opacity-50" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" />
      <div className="container-pp flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
        <div className="max-w-2xl">
          <nav className="mb-5 flex items-center gap-2 text-[13px] text-slate-400" aria-label="현재 위치">
            <Link to="/" className="hover:text-white"><i className="fa-solid fa-house" /></Link>
            <i className="fa-solid fa-chevron-right text-[9px]" />
            <span className="text-slate-200">{title}</span>
          </nav>
          {eyebrow && <p className="pp-eyebrow !text-sign-400">{eyebrow}</p>}
          <h1 className="pp-h1 mt-3 flex items-center gap-3 !text-white">
            {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-lg text-sign-400 ring-1 ring-white/15"><i className={`fa-solid ${icon}`} /></span>}
            {title}
          </h1>
          {desc && <p className="mt-4 text-[16px] leading-relaxed text-slate-300">{desc}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      <div className="bg-hazard h-1.5 opacity-90" />
    </section>
  )
}

export function PageHeader({ icon, title, desc, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="pp-h1 flex items-center gap-3">
          {icon && <i className={`fa-solid ${icon} text-brand-500`} />} {title}
        </h1>
        {desc && <p className="mt-2 text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function KpiCard({ icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-200',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300',
  }
  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg ${tones[tone]}`}>
        <i className={`fa-solid ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="pp-caption">{label}</p>
        <p className="pp-num mt-1 text-[26px] font-bold text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="pp-caption mt-1 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export function StatusLegend({ keys = ['empty', 'occupied', 'disabled', 'ev', 'reserved', 'alert'] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-600 dark:text-slate-300">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${k === 'alert' ? 'animate-blink' : ''}`} style={{ background: STATUS[k].color }} />
          {STATUS[k].label}
        </li>
      ))}
    </ul>
  )
}

export function Spinner({ label = '불러오는 중...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <i className="fa-solid fa-circle-notch fa-spin text-brand-500" /> {label}
    </div>
  )
}

export function EmptyState({ icon = 'fa-inbox', message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
      <i className={`fa-solid ${icon} text-3xl`} />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <i className="fa-solid fa-triangle-exclamation text-2xl" />
      <p className="text-sm">{message}</p>
      {onRetry && <button className="btn-outline" onClick={onRetry}>다시 시도</button>}
    </div>
  )
}

export const SEVERITY = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
}
