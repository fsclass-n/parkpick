import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TopButton from './TopButton'
import { USE_MOCK } from '../lib/config'
import { Spinner } from './ui'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      {USE_MOCK && (
        <div className="bg-slate-900 py-1.5 text-center text-[13px] text-slate-200">
          <i className="fa-solid fa-flask text-brand-400" /> Netlify 데모 환경 · 백엔드 없이 Mock 데이터로 동작합니다.
        </div>
      )}
      <Header />
      <main className="flex-1">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <TopButton />
    </div>
  )
}
