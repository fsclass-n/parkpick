import { Link } from 'react-router-dom'
import Logo from './Logo'
import { NAV } from './Header'
import { LINKS } from '../lib/config'
import { unsplash } from '../lib/images'

const TEAM = ['홍기흥 (조장)', '박미금', '김모란', '이오리']
const SNS = [['fa-instagram', 'Instagram'], ['fa-youtube', 'YouTube'], ['fa-linkedin-in', 'LinkedIn'], ['fa-github', 'GitHub', LINKS.github]]

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink-950 text-slate-400">
      {/* 도입 상담 CTA 밴드 */}
      <section className="relative isolate overflow-hidden">
        <img src={unsplash('garageCars', 1920, 60)} alt="" aria-hidden className="img-cover absolute inset-0 -z-20 opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/90 to-brand-900/60" />
        <div className="container-pp flex flex-col gap-8 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="pp-eyebrow !text-sign-400">FOR BUSINESS</p>
            <h2 className="pp-h2 mt-3 !text-white">주차장 운영, 이제 데이터로 관제하세요</h2>
            <p className="mt-3 max-w-xl text-slate-300">기존 CCTV 그대로 AI 관제를 도입할 수 있습니다. 상업시설·오피스·공영주차장 맞춤 구축을 상담해 드립니다.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:contact@parkpick.com?subject=parkpick 도입 문의" className="btn-sign !px-6 !py-3"><i className="fa-regular fa-paper-plane" /> 도입 상담 신청</a>
            <Link to="/login" className="btn-glass !px-6 !py-3"><i className="fa-solid fa-play" /> 데모 체험하기</Link>
          </div>
        </div>
        <div className="bg-hazard h-1.5 opacity-90" />
      </section>

      <div className="container-pp grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-5 text-sm leading-relaxed">
            주차 이동체 영상 데이터 기반 AI 주차관제 및 유도 시스템. 상업시설·오피스·공영주차장 운영사를 위한 B2B 주차관제 솔루션입니다.
          </p>
          <div className="mt-6 flex gap-2.5">
            {SNS.map(([icon, name, href]) => href ? (
              <a key={icon} href={href} target="_blank" rel="noreferrer" aria-label={name} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:border-sign-400 hover:text-sign-400"><i className={`fa-brands ${icon}`} /></a>
            ) : (
              <span key={icon} title={`${name} (준비 중)`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-slate-500"><i className={`fa-brands ${icon}`} /></span>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <h4 className="mb-4 font-mono text-[12px] font-bold tracking-[0.18em] !text-white">SERVICE</h4>
          <ul className="space-y-2.5 text-sm">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-white">{n.label}</Link></li>)}
          </ul>
        </div>
        <div className="md:col-span-3">
          <h4 className="mb-4 font-mono text-[12px] font-bold tracking-[0.18em] !text-white">CUSTOMER CENTER</h4>
          <p className="font-heading text-xl font-bold text-white">B2B 도입 문의</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><i className="fa-regular fa-clock mr-2 w-4" />평일 09:00 – 18:00 (주말·공휴일 휴무)</li>
            <li><a href="mailto:contact@parkpick.com" className="hover:text-white"><i className="fa-regular fa-envelope mr-2 w-4" />contact@parkpick.com</a></li>
            <li><a href={LINKS.pages} target="_blank" rel="noreferrer" className="hover:text-white"><i className="fa-solid fa-book-open mr-2 w-4" />프로젝트 안내 페이지</a></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h4 className="mb-4 font-mono text-[12px] font-bold tracking-[0.18em] !text-white">POLICY</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/policy/terms" className="hover:text-white">이용약관</Link></li>
            <li><Link to="/policy/privacy" className="font-semibold text-slate-200 hover:text-white">개인정보처리방침</Link></li>
            <li><Link to="/policy/cctv" className="hover:text-white">영상정보처리기기 운영·관리 방침</Link></li>
            <li><a href={LINKS.api} target="_blank" rel="noreferrer" className="hover:text-white">API 문서 (Swagger)</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="container-pp space-y-1.5 py-6 text-[12.5px] leading-relaxed">
          <p>parkpick · AI 주차관제 및 유도 시스템 프로젝트팀 | 팀 {TEAM.join(' · ')} | contact@parkpick.com</p>
          <p>데이터 출처: AI Hub(K-AI) ‘주차 관련 이동체 인지 영상’ · 공공데이터포털 주차장 정보 | Photos: Unsplash</p>
          <p className="pt-2 text-slate-500">© 2026 parkpick. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
