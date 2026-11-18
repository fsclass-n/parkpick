import { useEffect, useState } from 'react'

// 우측 하단 원형 'To the Top' 플로팅 버튼 (일정 거리 이상 스크롤 시 노출)
export default function TopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      aria-label="최상단으로 이동"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-30 grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-brand-700 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
    >
      <i className="fa-solid fa-arrow-up" />
    </button>
  )
}
