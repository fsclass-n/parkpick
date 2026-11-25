import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header, { UtilityBar } from './Header'
import Footer from './Footer'
import TopButton from './TopButton'
import LiveTicker from './LiveTicker'
import { USE_MOCK } from '../lib/config'
import { useLiveSummary } from '../lib/useLiveSummary'
import { Spinner } from './ui'

export default function Layout() {
  const { pathname } = useLocation()
  const { data: summary, connected } = useLiveSummary()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      {USE_MOCK && (
        <div className="bg-brand-700 py-1.5 text-center text-[12.5px] text-brand-50">
          <i className="fa-solid fa-flask text-sign-300" /> Netlify 데모 환경 · 백엔드 없이 Mock 데이터로 동작합니다.
        </div>
      )}
      <UtilityBar summary={summary} connected={connected} />
      <Header />
      <LiveTicker />
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
