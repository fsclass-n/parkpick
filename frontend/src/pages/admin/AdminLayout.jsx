import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui'

const TABS = [
  { to: '/admin', end: true, label: '모니터링 대시보드', icon: 'fa-gauge-high' },
  { to: '/admin/users', label: '회원 관리', icon: 'fa-users' },
  { to: '/admin/events', label: '이벤트 관제', icon: 'fa-triangle-exclamation' },
  { to: '/admin/reports', label: 'AI 운영 리포트', icon: 'fa-wand-magic-sparkles' },
  { to: '/admin/settings', label: '시스템 설정', icon: 'fa-sliders' },
]

export default function AdminLayout() {
  const { isTestAdmin } = useAuth()
  return (
    <div className="container-pp py-10">
      <PageHeader icon="fa-user-shield" title="관리자" desc="회원·주차장·AI 모델·이벤트를 관리하고 운영 현황을 모니터링합니다.">
        {isTestAdmin ? (
          <span className="badge bg-amber-100 !px-3 !py-1.5 text-amber-800 ring-1 ring-amber-300"><i className="fa-solid fa-lock" /> TEST ADMIN · 읽기 전용 (번호판·이메일 마스킹)</span>
        ) : (
          <span className="badge bg-emerald-100 !px-3 !py-1.5 text-emerald-700"><i className="fa-solid fa-shield-halved" /> 관리자 · 전체 CRUD 권한</span>
        )}
      </PageHeader>
      <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-px" aria-label="관리자 메뉴">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <i className={`fa-solid ${t.icon}`} /> {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
