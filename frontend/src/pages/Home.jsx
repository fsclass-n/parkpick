import { Link } from 'react-router-dom'
import { useApi } from '../lib/useApi'
import { useParkingStream } from '../lib/realtime'
import { pct } from '../lib/format'
import { KpiCard, StatusLegend } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { to: '/monitor', icon: 'fa-display', title: '실시간 관제', desc: '층·구역별 주차면 점유 현황과 CCTV 영상 분석 결과를 WebSocket으로 실시간 확인합니다.' },
  { to: '/guide', icon: 'fa-route', title: '주차 유도', desc: '입구에서 가장 가까운 빈 주차면을 추천하고 진입 경로를 안내합니다.' },
  { to: '/find-car', icon: 'fa-magnifying-glass-location', title: '내 차 찾기', desc: '번호판 인식(OCR) 결과로 차량 번호만 입력하면 주차 위치를 찾아줍니다.' },
  { to: '/reports', icon: 'fa-chart-line', title: '운영 리포트', desc: '점유율·회전율·혼잡도 분석과 Gemini 기반 운영 리포트를 제공합니다.' },
]

const PIPELINE = [
  { icon: 'fa-video', title: 'CCTV 영상 수집', desc: '주차장 CCTV / RTSP 스트림' },
  { icon: 'fa-brain', title: 'AI 이동체 탐지', desc: 'YOLO 객체 탐지 + ByteTrack 추적' },
  { icon: 'fa-square-parking', title: '점유 판별', desc: '주차면 ROI 다각형 매칭 · 번호판 OCR' },
  { icon: 'fa-tower-broadcast', title: '관제 · 유도', desc: 'WebSocket 실시간 대시보드 · 유도 안내' },
]

export default function Home() {
  const { user } = useAuth()
  const { data: summary, setData } = useApi('/api/parking/summary')

  useParkingStream((msg) => {
    if (msg.type !== 'space_update' || !summary) return
    setData((s) => {
      if (!s) return s
      const delta = msg.space.status === 'occupied' ? 1 : -1
      const occupied = Math.min(s.total, Math.max(0, s.occupied + delta))
      return { ...s, occupied, empty: s.total - occupied, rate: occupied / s.total }
    })
  })

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="container-pp relative grid items-center gap-12 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <span className="badge bg-white/10 text-brand-100 ring-1 ring-white/20">
              <i className="fa-solid fa-microchip" /> AI 모델 · K-AI 데이터 기반 B2B 주차관제 플랫폼
            </span>
            <h1 className="mt-6 font-heading text-[36px] font-bold leading-[1.2] !text-white md:text-[52px]">
              CCTV 영상으로 보는<br />
              <span className="text-brand-200">스마트 주차관제</span> 솔루션
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-200">
              차량·보행자 이동체를 AI로 실시간 인식해 주차면 점유를 판별합니다. 운전자는 빈 자리로 바로 안내받고, 운영사는 관제 대시보드로 주차장을 효율적으로 운영합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/monitor" className="btn bg-white text-brand-700 hover:bg-brand-50"><i className="fa-solid fa-display" /> 실시간 관제 보기</Link>
              <Link to="/guide" className="btn border border-white/30 text-white hover:bg-white/10"><i className="fa-solid fa-route" /> 빈 자리 안내받기</Link>
              {!user && <Link to="/login" className="btn text-brand-100 hover:text-white">테스트 계정으로 체험 <i className="fa-solid fa-arrow-right" /></Link>}
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="font-heading text-lg font-semibold">실시간 주차 현황</p>
                <span className="badge bg-emerald-400/20 text-emerald-200"><span className="h-2 w-2 animate-blink rounded-full bg-emerald-300" /> LIVE</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">parkpick 스마트타워 주차장</p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  ['빈 자리', summary?.empty ?? '-', 'text-emerald-300'],
                  ['점유', summary?.occupied ?? '-', 'text-red-300'],
                  ['점유율', summary ? pct(summary.rate, 0) : '-', 'text-white'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-2xl bg-slate-950/40 p-4">
                    <p className={`font-heading text-[28px] font-bold tabular-nums ${tone}`}>{value}</p>
                    <p className="text-[13px] text-slate-300">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {summary?.by_floor.map((f) => (
                  <div key={f.floor}>
                    <div className="mb-1 flex justify-between text-sm"><span>{f.floor}층</span><span className="tabular-nums">{f.empty}면 여유</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-red-400 transition-all duration-700" style={{ width: pct(f.rate) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-pp -mt-10 relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon="fa-square-parking" label="전체 주차면" value={summary?.total ?? '-'} sub="B1 · B2 / 4개 구역" />
        <KpiCard icon="fa-circle-check" tone="green" label="현재 빈 자리" value={summary?.empty ?? '-'} sub="실시간 WebSocket 갱신" />
        <KpiCard icon="fa-car" tone="red" label="현재 점유" value={summary?.occupied ?? '-'} sub={summary ? `점유율 ${pct(summary.rate)}` : ''} />
        <KpiCard icon="fa-bolt" tone="cyan" label="전기차·장애인 전용" value={summary ? summary.by_kind.filter((k) => ['ev', 'disabled'].includes(k.kind)).reduce((s, k) => s + k.empty, 0) : '-'} sub="전용 주차면 여유" />
      </section>

      <section className="container-pp mt-24">
        <p className="text-sm font-semibold text-brand-600">SERVICE</p>
        <h2 className="pp-h2 mt-2">주차장 운영에 필요한 모든 기능</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className="card group transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-xl text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <i className={`fa-solid ${f.icon}`} />
              </span>
              <h3 className="pp-h3 mt-5">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{f.desc}</p>
              <p className="mt-4 text-sm font-semibold text-brand-600">바로가기 <i className="fa-solid fa-arrow-right transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-pp mt-24">
        <div className="card p-8 md:p-12">
          <p className="text-sm font-semibold text-brand-600">HOW IT WORKS</p>
          <h2 className="pp-h2 mt-2">영상 데이터에서 관제·유도까지</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <li key={p.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white"><i className={`fa-solid ${p.icon}`} /></span>
                  <span className="font-heading text-sm font-bold text-slate-400">STEP {i + 1}</span>
                </div>
                <h3 className="pp-h3 mt-4 text-[18px]">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 border-t border-slate-100 pt-6"><StatusLegend /></div>
        </div>
      </section>

      <section className="container-pp mt-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['fa-store', '대형 상업시설', '주말·피크 시간대 혼잡 분산과 빈 자리 유도로 입차 대기시간 단축'],
            ['fa-building', '오피스 빌딩', '정기권·방문 차량 관리, 장기 주차 및 불법 주차 이벤트 자동 감지'],
            ['fa-city', '공영주차장 운영사', '공공데이터 연계, 다수 주차장 통합 관제와 운영 리포트 자동화'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="card">
              <i className={`fa-solid ${icon} text-2xl text-brand-500`} />
              <h3 className="pp-h3 mt-4">{title}</h3>
              <p className="mt-2 text-[15px] text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl bg-brand-600 px-6 py-12 text-center text-white">
          <h2 className="pp-h2 !text-white">지금 parkpick 관제 화면을 체험해 보세요</h2>
          <p className="text-brand-100">일반 사용자 · 테스트 관리자(읽기 전용) 계정으로 바로 로그인할 수 있습니다.</p>
          <Link to={user ? '/monitor' : '/login'} className="btn bg-white text-brand-700 hover:bg-brand-50">{user ? '관제 화면으로 이동' : '테스트 계정으로 시작하기'} <i className="fa-solid fa-arrow-right" /></Link>
        </div>
      </section>
    </>
  )
}
