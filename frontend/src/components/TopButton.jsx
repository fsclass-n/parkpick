import { useEffect, useState } from 'react'

const R = 22
const C = 2 * Math.PI * R

// 우측 하단 원형 'To the Top' 플로팅 버튼 — 테두리 링이 페이지 스크롤 진행률을 표시
export default function TopButton() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  const visible = progress > 0.04
  return (
    <button
      aria-label="최상단으로 이동"
      onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      className={`group fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-ink-900 text-white shadow-xl shadow-ink-900/30 transition-all duration-300 hover:-translate-y-1 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={R} fill="none" strokeWidth="3" className="stroke-white/10" />
        <circle cx="26" cy="26" r={R} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-sign-400 transition-[stroke-dashoffset] duration-150"
          strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
      </svg>
      <span className="flex flex-col items-center leading-none">
        <i className="fa-solid fa-arrow-up text-sm transition group-hover:-translate-y-0.5" />
        <span className="mt-0.5 font-mono text-[8.5px] font-bold tracking-wider text-slate-400">TOP</span>
      </span>
    </button>
  )
}
