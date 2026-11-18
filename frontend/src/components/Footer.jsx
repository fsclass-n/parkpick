import { Link } from 'react-router-dom'
import Logo from './Logo'
import { LINKS } from '../lib/config'

const TEAM = ['홍기흥 (조장)', '박미금', '김모란', '이오리']

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-950 text-slate-400">
      <div className="container-pp grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed">
            주차 이동체 영상 데이터 기반 AI 주차관제 및 유도 시스템. 상업시설·오피스·공영주차장 운영사를 위한 B2B 주차관제 솔루션입니다.
          </p>
          <p className="mt-4 text-[13px]">프로젝트 팀 · {TEAM.join(' · ')}</p>
        </div>
        <div className="md:col-span-3">
          <h4 className="mb-4 text-sm font-semibold !text-white">고객센터</h4>
          <ul className="space-y-2 text-sm">
            <li><i className="fa-solid fa-building mr-2 w-4" />도입 문의 (B2B)</li>
            <li><i className="fa-regular fa-clock mr-2 w-4" />평일 09:00 – 18:00 (주말·공휴일 휴무)</li>
            <li><a href="mailto:contact@parkpick.com" className="hover:text-white"><i className="fa-regular fa-envelope mr-2 w-4" />contact@parkpick.com</a></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h4 className="mb-4 text-sm font-semibold !text-white">정책</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/policy/terms" className="hover:text-white">이용약관</Link></li>
            <li><Link to="/policy/privacy" className="font-semibold text-slate-200 hover:text-white">개인정보처리방침</Link></li>
            <li><Link to="/policy/cctv" className="hover:text-white">영상정보처리기기 운영·관리 방침</Link></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h4 className="mb-4 text-sm font-semibold !text-white">바로가기</h4>
          <ul className="space-y-2 text-sm">
            <li><a href={LINKS.github} target="_blank" rel="noreferrer" className="hover:text-white"><i className="fa-brands fa-github mr-2 w-4" />GitHub Repository</a></li>
            <li><a href={LINKS.pages} target="_blank" rel="noreferrer" className="hover:text-white"><i className="fa-solid fa-book-open mr-2 w-4" />프로젝트 안내 페이지</a></li>
            <li><a href={LINKS.api} target="_blank" rel="noreferrer" className="hover:text-white"><i className="fa-solid fa-code mr-2 w-4" />API 문서</a></li>
          </ul>
          <div className="mt-5 flex gap-3 text-lg">
            {[['fa-instagram', 'Instagram'], ['fa-youtube', 'YouTube'], ['fa-linkedin', 'LinkedIn']].map(([icon, name]) => (
              <span key={icon} title={`${name} (준비 중)`} className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-slate-300"><i className={`fa-brands ${icon}`} /></span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container-pp flex flex-col gap-2 py-6 text-[13px] md:flex-row md:justify-between">
          <p>데이터 출처: AI Hub(K-AI) ‘주차 관련 이동체 인지 영상’ · 공공데이터포털 주차장 정보</p>
          <p>© 2026 parkpick. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
