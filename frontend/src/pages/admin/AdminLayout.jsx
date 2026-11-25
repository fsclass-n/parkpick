import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageHero } from '../../components/ui'

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
    <>
      <PageHero image="cctvWall" eyebrow={isTestAdmin ? 'ADMIN CONSOLE · READ ONLY' : 'ADMIN CONSOLE'} icon="fa-user-shield" title="관리자"
        desc="회원·주차장·AI 모델·이벤트를 관리하고 운영 현황을 모니터링합니다.">
        {isTestAdmin ? (
          <span className="badge bg-amber-400 !px-3 !py-1.5 text-ink-900"><i className="fa-solid fa-lock" /> TEST ADMIN · 읽기 전용 (번호판·이메일 마스킹)</span>
        ) : (
          <span className="badge bg-led !px-3 !py-1.5 text-ink-900"><i className="fa-solid fa-shield-halved" /> 관리자 · 전체 CRUD 권한</span>
        )}
      </PageHero>
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur md:top-[72px]">
        <nav className="container-pp flex gap-1 overflow-x-auto" aria-label="관리자 메뉴">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 border-b-[3px] px-4 py-4 text-sm font-semibold transition ${isActive ? 'border-sign-400 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {isTestAdmin && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="container-pp py-2.5 text-[13px] text-amber-800"><i className="fa-solid fa-circle-info mr-1.5" />테스트 관리자 세션입니다. 모든 화면을 조회할 수 있지만 생성·수정·삭제 요청은 서버에서 차단됩니다.</p>
        </div>
      )}
      <div className="container-pp py-8">
        <Outlet />
      </div>
    </>
  )
}
