import { Link } from 'react-router-dom'

export default function Logo({ light = false, onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2" aria-label="parkpick 메인으로 이동">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <i className="fa-solid fa-square-parking text-lg" />
      </span>
      <span className={`font-heading text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        park<span className="text-brand-500">pick</span>
      </span>
    </Link>
  )
}
