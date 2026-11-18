import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { EVENT_LABEL, ROLE_LABEL } from '../lib/config'
import { formatDateTime } from '../lib/format'
import { useParkingStream } from '../lib/realtime'

export const NAV = [
  { to: '/monitor', label: '실시간 관제', icon: 'fa-display' },
  { to: '/guide', label: '주차 유도', icon: 'fa-route' },
  { to: '/find-car', label: '내 차 찾기', icon: 'fa-magnifying-glass-location' },
  { to: '/reports', label: '운영 리포트', icon: 'fa-chart-line' },
]

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-[15px] font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

function useOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside()
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
}

export function ReadOnlyBadge({ className = '' }) {
  return (
    <span className={`badge bg-amber-100 text-amber-800 ring-1 ring-amber-300 ${className}`} title="데이터 생성·수정·삭제가 차단된 읽기 전용 세션">
      <i className="fa-solid fa-lock" /> TEST ADMIN · 읽기 전용
    </span>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  useOutside(ref, () => setOpen(false))

  useEffect(() => {
    api.get('/api/parking/events/recent').then((list) => { setEvents(list); setUnread(list.length) }).catch(() => {})
  }, [])
  useParkingStream((msg) => {
    if (msg.type !== 'event') return
    setEvents((list) => [msg.event, ...list].slice(0, 10))
    setUnread((n) => n + 1)
  })

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative h-10 w-10 !p-0" aria-label="이상 이벤트 알림" onClick={() => { setOpen(!open); setUnread(0) }}>
        <i className="fa-regular fa-bell text-lg" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-st-alert px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">이상 이벤트 알림</p>
          <ul className="max-h-80 overflow-y-auto">
            {events.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">새 이벤트가 없습니다.</li>}
            {events.map((e) => (
              <li key={`${e.id}-${e.created_at}`} className="flex gap-3 border-b border-slate-50 px-4 py-3 text-sm">
                <i className="fa-solid fa-triangle-exclamation mt-0.5 text-st-alert" />
                <div>
                  <p className="font-medium">[{EVENT_LABEL[e.kind]}] {e.message}</p>
                  <p className="pp-caption">{e.space_code || e.camera} · {formatDateTime(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useOutside(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100" onClick={() => setOpen(!open)}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{user.name.slice(0, 1)}</span>
        <span className="hidden text-sm font-medium lg:inline">{user.name}</span>
        <i className="fa-solid fa-chevron-down text-xs text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl" onClick={() => setOpen(false)}>
          <p className="truncate px-4 pb-2 pt-1 text-[13px] text-slate-500">{ROLE_LABEL[user.role]} · {user.email}</p>
          <Link to="/mypage" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><i className="fa-regular fa-user w-4" /> 마이페이지</Link>
          {isAdmin && <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><i className="fa-solid fa-user-shield w-4" /> 관리자</Link>}
          <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { logout(); navigate('/') }}>
            <i className="fa-solid fa-arrow-right-from-bracket w-4" /> 로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

// 햄버거 ↔ X 아이콘 전환 모션
function Hamburger({ open, onClick }) {
  const bar = 'absolute left-0 h-0.5 w-6 rounded bg-current transition-all duration-300 ease-out'
  return (
    <button className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
      aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} onClick={onClick}>
      <span className="relative block h-5 w-6">
        <span className={`${bar} ${open ? 'top-[9px] rotate-45' : 'top-0.5'}`} />
        <span className={`${bar} top-[9px] ${open ? 'translate-x-3 opacity-0' : 'opacity-100'}`} />
        <span className={`${bar} ${open ? 'top-[9px] -rotate-45' : 'top-4'}`} />
      </span>
    </button>
  )
}

// 우측 → 좌측 슬라이드 드로어
function MobileDrawer({ open, onClose }) {
  const { user, isAdmin, isTestAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const item = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`
  // 헤더의 backdrop-blur 가 fixed 요소의 기준 영역이 되지 않도록 body 로 포털 렌더링
  return createPortal(
    <div className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Logo onClick={onClose} />
          <Hamburger open onClick={onClose} />
        </div>
        <div className="border-b border-slate-100 p-5">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 font-bold text-white">{user.name.slice(0, 1)}</span>
              <div className="min-w-0">
                <p className="font-semibold">{user.name}</p>
                <p className="pp-caption truncate">{ROLE_LABEL[user.role]} · {user.email}</p>
              </div>
            </div>
          ) : (
            <Link to="/login" onClick={onClose} className="btn-primary w-full"><i className="fa-solid fa-right-to-bracket" /> 로그인 / 회원가입</Link>
          )}
          {isTestAdmin && <ReadOnlyBadge className="mt-3" />}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={item} onClick={onClose}><i className={`fa-solid ${n.icon} w-5 text-brand-500`} /> {n.label}</NavLink>
          ))}
          {user && <NavLink to="/mypage" className={item} onClick={onClose}><i className="fa-regular fa-user w-5 text-brand-500" /> 마이페이지</NavLink>}
          {isAdmin && <NavLink to="/admin" className={item} onClick={onClose}><i className="fa-solid fa-user-shield w-5 text-brand-500" /> 관리자</NavLink>}
        </nav>
        {user && (
          <div className="border-t border-slate-100 p-4">
            <button className="btn-outline w-full !text-red-600" onClick={() => { logout(); onClose(); navigate('/') }}>
              <i className="fa-solid fa-arrow-right-from-bracket" /> 로그아웃
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  )
}

export default function Header() {
  const { user, isAdmin, isTestAdmin } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setDrawer(false)
  }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
  }, [drawer])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="container-pp flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} className={navClass}>{n.label}</NavLink>)}
          {isAdmin && <NavLink to="/admin" className={navClass}>관리자</NavLink>}
        </nav>
        <div className="flex items-center gap-1 md:gap-2">
          {isTestAdmin && <ReadOnlyBadge className="hidden lg:inline-flex" />}
          {user && <Notifications />}
          <div className="hidden md:block">
            {user ? <ProfileMenu /> : <Link to="/login" className="btn-primary !py-2"><i className="fa-solid fa-right-to-bracket" /> 로그인</Link>}
          </div>
          <Hamburger open={drawer} onClick={() => setDrawer(!drawer)} />
        </div>
      </div>
      {isTestAdmin && (
        <div className="bg-amber-50 py-1.5 text-center text-[13px] text-amber-800 lg:hidden">
          <i className="fa-solid fa-lock" /> TEST ADMIN · 읽기 전용 세션입니다.
        </div>
      )}
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </header>
  )
}
