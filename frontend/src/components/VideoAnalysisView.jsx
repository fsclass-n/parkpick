import { useEffect, useRef } from 'react'

const CLASS_COLOR = { car: '#22c55e', person: '#f59e0b', motorcycle: '#a855f7' }

function makeMovers() {
  let id = 100
  return {
    next: () => ++id,
    list: [
      { id: ++id, cls: 'car', x: -160, y: 250, w: 150, h: 80, vx: 1.6 },
      { id: ++id, cls: 'person', x: 820, y: 230, w: 34, h: 86, vx: -0.6 },
      { id: ++id, cls: 'motorcycle', x: 300, y: 262, w: 70, h: 62, vx: 1.1 },
    ],
  }
}

/**
 * CCTV 영상 분석 뷰 (샘플 영상 시뮬레이션).
 * 실제 운영 시 ai/pipeline.py 추론 결과(바운딩 박스 + 추적 ID)를 같은 방식으로 오버레이합니다.
 * masked=true 이면 번호판·인물 얼굴 영역을 블러 처리합니다 (테스트 관리자 / 개인정보 보호).
 */
export default function VideoAnalysisView({ camera, spaces = [], masked = true }) {
  const canvasRef = useRef(null)
  const spacesRef = useRef(spaces)
  spacesRef.current = spaces

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const movers = makeMovers()
    let frame = 0
    let raf

    const blur = (x, y, w, h) => {
      ctx.save()
      ctx.fillStyle = 'rgba(148,163,184,0.85)'
      ctx.filter = 'blur(3px)'
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    }
    const box = (d, conf) => {
      const color = CLASS_COLOR[d.cls]
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(d.x, d.y, d.w, d.h)
      const label = `${d.cls} #${d.id} ${conf.toFixed(2)}`
      ctx.font = '600 12px "Noto Sans KR", sans-serif'
      const tw = ctx.measureText(label).width + 10
      ctx.fillStyle = color
      ctx.fillRect(d.x, d.y - 18, tw, 18)
      ctx.fillStyle = '#0f172a'
      ctx.fillText(label, d.x + 5, d.y - 5)
    }

    const draw = () => {
      frame++
      const W = canvas.width
      const H = canvas.height
      // 배경: 실내 주차장 (원근감 있는 바닥 + 주차선)
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#1e293b')
      grad.addColorStop(1, '#334155')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, 225, W, 120)
      ctx.strokeStyle = '#facc15'
      ctx.setLineDash([24, 18])
      ctx.beginPath()
      ctx.moveTo(0, 285)
      ctx.lineTo(W, 285)
      ctx.stroke()
      ctx.setLineDash([])

      // 상단 주차면 (실제 점유 데이터 반영) - ROI 다각형
      const row = spacesRef.current.slice(0, 8)
      row.forEach((s, i) => {
        const x = 20 + i * 98
        ctx.strokeStyle = s.status === 'occupied' ? '#ef4444' : '#22c55e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 12, 60)
        ctx.lineTo(x + 86, 60)
        ctx.lineTo(x + 94, 215)
        ctx.lineTo(x + 4, 215)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '11px "Noto Sans KR", sans-serif'
        ctx.fillText(s.code, x + 24, 52)
        if (s.status === 'occupied') {
          const car = { id: 10 + i, cls: 'car', x: x + 16, y: 92, w: 68, h: 112 }
          ctx.fillStyle = ['#94a3b8', '#e2e8f0', '#1d4ed8', '#b91c1c'][i % 4]
          ctx.fillRect(car.x + 6, car.y + 8, car.w - 12, car.h - 16)
          box(car, 0.9 + ((i * 7) % 9) / 100)
          if (masked) blur(car.x + 20, car.y + car.h - 26, 30, 12)
        }
      })

      // 통로 이동체 (추적 ID 유지)
      movers.list.forEach((m) => {
        m.x += m.vx
        if (m.x > W + 40 || m.x < -200) {
          m.x = m.vx > 0 ? -180 : W + 20
          m.id = movers.next()
        }
        ctx.fillStyle = m.cls === 'car' ? '#cbd5e1' : m.cls === 'person' ? '#fbbf24' : '#c084fc'
        ctx.fillRect(m.x + 6, m.y + 8, m.w - 12, m.h - 14)
        box(m, 0.86 + ((m.id * 13) % 12) / 100)
        if (masked && m.cls === 'person') blur(m.x + 4, m.y, m.w - 8, m.h * 0.25)
        if (masked && m.cls === 'car') blur(m.x + m.w - 14, m.y + 30, 10, 22)
      })

      // HUD
      ctx.fillStyle = 'rgba(15,23,42,0.75)'
      ctx.fillRect(10, 10, 300, 26)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '600 12px "Noto Sans KR", sans-serif'
      const t = new Date().toLocaleTimeString('ko-KR')
      ctx.fillText(`● REC  ${camera || 'CCTV'}  ${t}  YOLO+ByteTrack`, 18, 28)
      if (frame % 60 < 30) {
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(22, 23, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [camera, masked])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
      <canvas ref={canvasRef} width={820} height={360} className="block h-auto w-full" />
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-2 text-[12px] text-slate-400">
        <span><i className="fa-solid fa-circle-info mr-1" /> 샘플 영상 시뮬레이션 · 실제 CCTV 연동 시 ai/pipeline.py 추론 결과를 오버레이</span>
        <span>{masked ? <><i className="fa-solid fa-eye-slash mr-1" />번호판·얼굴 블러 적용</> : <><i className="fa-solid fa-eye mr-1" />원본 표시 (관리자)</>}</span>
      </div>
    </div>
  )
}
