import { Link } from 'react-router-dom'
import { unsplash } from '../lib/images'

export default function NotFound() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <img src={unsplash('entrance', 1920)} alt="" aria-hidden className="img-cover absolute inset-0 -z-20 opacity-40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
      <div className="container-pp flex flex-col items-start py-28 md:py-36">
        <p className="pp-eyebrow !text-sign-400">ERROR 404 · NO SPACE FOUND</p>
        <p className="mt-6 font-mono text-[96px] font-extrabold leading-none text-led md:text-[140px]" style={{ textShadow: '0 0 24px rgba(52,245,161,.45)' }}>404</p>
        <h1 className="pp-h1 mt-6 !text-white">이 주소에는 주차면이 없습니다</h1>
        <p className="mt-3 max-w-lg text-slate-300">주소가 변경되었거나 존재하지 않는 페이지입니다. 메인으로 돌아가 가까운 빈 자리를 안내받으세요.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/" className="btn-sign !px-6 !py-3"><i className="fa-solid fa-house" /> 메인으로 이동</Link>
          <Link to="/guide" className="btn-glass !px-6 !py-3"><i className="fa-solid fa-location-arrow" /> 빈 자리 찾기</Link>
        </div>
      </div>
      <div className="bg-hazard h-1.5 opacity-90" />
    </section>
  )
}
