import { useState } from 'react'
import { useParkingStream } from '../lib/realtime'
import { EVENT_LABEL } from '../lib/config'

const SEED = [
  { id: 's1', tone: 'info', text: 'AI 관제 채널 대기 중 · CCTV 8대 YOLO + ByteTrack 분석' },
  { id: 's2', tone: 'info', text: '번호판·얼굴 자동 블러 처리로 개인정보를 보호합니다' },
  { id: 's3', tone: 'info', text: '빈 자리가 생기면 즉시 주차 유도 경로를 다시 계산합니다' },
]
const TONE = { in: 'text-red-400', out: 'text-led', alert: 'text-st-alert', info: 'text-sign-400' }
const ICON = { in: 'fa-car-side', out: 'fa-square-parking', alert: 'fa-triangle-exclamation', info: 'fa-tower-broadcast' }
const time = () => new Date().toLocaleTimeString('ko-KR', { hour12: false })

// 전 페이지 공통 실시간 운영 티커: WebSocket 입·출차 / 이상 이벤트를 전광판처럼 흘려 보여줌
export default function LiveTicker() {
  const [items, setItems] = useState(SEED)
  const connected = useParkingStream((msg) => {
    let item = null
    if (msg.type === 'space_update') {
      const occupied = msg.space.status === 'occupied'
      item = { tone: occupied ? 'in' : 'out', text: `${msg.space.code} ${occupied ? '입차 · 점유 전환' : '출차 · 빈 자리 발생'}` }
    } else if (msg.type === 'event') {
      item = { tone: 'alert', text: `[${EVENT_LABEL[msg.event.kind] || '이벤트'}] ${msg.event.message}` }
    }
    if (item) setItems((list) => [{ ...item, id: `${Date.now()}-${Math.random()}`, at: time() }, ...list.filter((i) => !i.id.startsWith('s'))].slice(0, 14))
  })
  const loop = items.length < 6 ? [...items, ...SEED] : items

  return (
    <div className="group relative flex h-9 items-center overflow-hidden border-b border-white/5 bg-ink-900 text-[12.5px] text-slate-300">
      <span className="relative z-10 flex h-full shrink-0 items-center gap-2 bg-sign-400 px-3 font-mono text-[11px] font-extrabold tracking-[0.16em] text-ink-900">
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-blink bg-red-600' : 'bg-ink-900/40'}`} /> LIVE OPS
      </span>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap pl-6 group-hover:[animation-play-state:paused]">
          {[...loop, ...loop].map((i, idx) => (
            <span key={`${i.id}-${idx}`} className="flex items-center gap-2">
              <i className={`fa-solid ${ICON[i.tone]} ${TONE[i.tone]}`} />
              {i.at && <span className="font-mono text-slate-500">{i.at}</span>}
              {i.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
