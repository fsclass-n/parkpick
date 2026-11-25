import { Link } from 'react-router-dom'

export default function Logo({ light = false, onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2.5" aria-label="parkpick 메인으로 이동">
      <img src="/favicon.png" alt="" width="36" height="36" className="h-9 w-9 rounded-[10px] shadow-sm" />
      <span className="leading-none">
        <span className={`block font-heading text-[21px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          park<span className="text-brand-500">pick</span>
        </span>
        <span className={`mt-0.5 block font-mono text-[9.5px] font-bold tracking-[0.22em] ${light ? 'text-slate-400' : 'text-slate-400'}`}>AI PARKING CONTROL</span>
      </span>
    </Link>
  )
}
