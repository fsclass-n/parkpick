import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/useApi'
import { useLiveSummary } from '../lib/useLiveSummary'
import { useParkingStream } from '../lib/realtime'
import { pct } from '../lib/format'
import { unsplash } from '../lib/images'
import { useAuth } from '../context/AuthContext'
import { StatusLegend } from '../components/ui'
import LedSign from '../components/LedSign'
import VideoAnalysisView from '../components/VideoAnalysisView'

const FEATURES = [
  { to: '/monitor', image: 'garageCars', icon: 'fa-display', title: '실시간 관제', desc: '층·구역별 주차면 점유와 CCTV 분석 결과를 WebSocket으로 실시간 확인합니다.' },
  { to: '/guide', image: 'garagePillar', icon: 'fa-route', title: '주차 유도', desc: '입구에서 가장 가까운 빈 자리를 추천하고 진입 경로를 애니메이션으로 안내합니다.' },
  { to: '/find-car', image: 'aerialYellow', icon: 'fa-magnifying-glass-location', title: '내 차 찾기', desc: '번호판 인식(OCR) 결과로 차량 번호만 입력하면 주차 위치와 보행 동선을 보여줍니다.' },
  { to: '/reports', image: 'analytics', icon: 'fa-chart-line', title: '운영 리포트', desc: '점유율·회전율·혼잡도를 분석하고 Gemini가 운영 개선 리포트를 작성합니다.' },
]

const PIPELINE = [
  { icon: 'fa-video', title: 'CCTV 영상 수집', desc: '기존 주차장 CCTV · RTSP 스트림을 그대로 활용' },
  { icon: 'fa-brain', title: 'AI 이동체 탐지·추적', desc: 'YOLO 객체 탐지 + ByteTrack 다중 객체 추적' },
  { icon: 'fa-draw-polygon', title: '점유 판별 · OCR', desc: '주차면 ROI 커버리지 다수결 · 번호판 인식' },
  { icon: 'fa-tower-broadcast', title: '관제 · 유도', desc: '실시간 대시보드 푸시 · 빈 자리 경로 안내' },
]

const CASES = [
  { image: 'garageChevron', tag: 'RETAIL', title: '대형 상업시설', desc: '주말·피크 시간 혼잡 분산과 빈 자리 유도로 입차 대기열을 줄입니다.', points: ['층별 실시간 전광판 연동', '피크 시간 혼잡도 분석'] },
  { image: 'officeTowers', tag: 'OFFICE', title: '오피스 빌딩', desc: '정기권·방문 차량을 구분하고 장기·불법 주차를 자동으로 감지합니다.', points: ['장기 주차 이벤트 알림', '방문 차량 번호판 조회'] },
  { image: 'aerialLot', tag: 'PUBLIC', title: '공영주차장', desc: '공공데이터와 연계해 다수 주차장의 가용 현황을 통합 관제합니다.', points: ['다중 주차장 통합 대시보드', '회전율·운영 리포트'] },
  { image: 'evGarage', tag: 'EV', title: '전기차 충전 구역', desc: '충전 구역 일반 차량 점유를 감지하고 EV 운전자에게 충전면을 안내합니다.', points: ['EV 전용면 유도', '충전면 점유 감시'] },
]

// 도입 효과 시뮬레이터 가정치 (보수적 추정)
const SAVE_RATE = 0.6 // AI 유도 도입 시 주차면 탐색 시간 절감 비율
const CRUISE_KMH = 8 // 주차장 내 배회 주행 평균 속도
const CO2_KG_PER_KM = 0.17 // 승용차 1km 주행당 CO2 배출량
const PINE_KG_PER_YEAR = 6.6 // 30년생 소나무 1그루 연간 CO2 흡수량

// 이전 값에서 목표 값까지 이징 카운트 (실시간 갱신 시 0부터 다시 세지 않음)
function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (target == null) return undefined
    const start = performance.now()
    const base = from.current
    let raf
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms)
      from.current = Math.round(base + (target - base) * (1 - (1 - k) ** 3))
      setValue(from.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf) }
  }, [target, ms])
  return value
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => { setNow(new Date()) }, 1000)
    return () => { clearInterval(id) }
  }, [])
  return <>{now.toLocaleDateString('sv-SE')} {now.toLocaleTimeString('ko-KR', { hour12: false })}</>
}

// CCTV 뷰파인더 오버레이: 코너 브래킷 · 스캔 라인 · REC 표시
function Viewfinder() {
  const corner = 'absolute h-8 w-8 border-sign-400/80'
  return (
    <div className="pointer-events-none absolute inset-4 md:inset-8" aria-hidden>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
      <div className="absolute inset-0 overflow-hidden">
        <div className="h-1/3 w-full animate-scan bg-gradient-to-b from-transparent via-led/10 to-transparent" />
      </div>
      <p className="absolute left-4 top-3 hidden items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-white/70 md:flex">
        <span className="h-2 w-2 animate-blink rounded-full bg-red-500" /> REC · CCTV-B1-A · <Clock />
      </p>
      <p className="absolute right-4 top-3 hidden font-mono text-[11px] font-bold tracking-widest text-led/80 md:block">YOLO · BYTETRACK · LIVE</p>
    </div>
  )
}

function Hero({ summary, user }) {
  const empty = useCountUp(summary?.empty)
  const ev = summary?.by_kind.find((k) => k.kind === 'ev')
  const disabled = summary?.by_kind.find((k) => k.kind === 'disabled')
  const rows = [
    ...(summary?.by_floor || [{ floor: 'B1' }, { floor: 'B2' }]).map((f) => ({
      label: f.floor, value: f.empty, icon: 'fa-arrow-right', caption: f.total ? `${f.floor}층 · 점유율 ${pct(f.rate, 0)}` : '불러오는 중',
    })),
    { label: 'EV', value: ev?.empty, caption: '전기차 충전면', icon: 'fa-bolt' },
    { label: 'DIS', value: disabled?.empty, caption: '장애인 전용면', icon: 'fa-wheelchair' },
  ]
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <img src={unsplash('garageTeal', 2200)} alt="CCTV로 관제 중인 지하 주차장" className="img-cover absolute inset-0 -z-20 scale-105 opacity-60" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
      <Viewfinder />
      <div className="container-pp grid items-center gap-12 pb-24 pt-20 md:pb-32 md:pt-28 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="pp-eyebrow !text-sign-400"><span className="h-px w-8 bg-sign-400" /> AI PARKING CONTROL · K-AI DATA</p>
          <h1 className="pp-display mt-6 !text-white">
            빈 자리를 찾는 시간,<br />
            <span className="bg-gradient-to-r from-sign-300 via-sign-400 to-led bg-clip-text text-transparent">AI가 0분으로</span> 만듭니다
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-300">
            주차장 CCTV 영상 속 차량·보행자를 AI가 실시간으로 인식해 주차면 점유를 판별합니다.
            운전자는 가장 가까운 빈 자리로, 운영사는 하나의 관제 화면으로.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/guide" className="btn-sign !px-6 !py-3.5 text-[15px]"><i className="fa-solid fa-location-arrow" /> 지금 빈 자리 안내받기</Link>
            <Link to="/monitor" className="btn-glass !px-6 !py-3.5 text-[15px]"><i className="fa-solid fa-display" /> 실시간 관제 보기</Link>
          </div>
          {!user && (
            <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              일반 사용자 · 테스트 관리자 계정으로 바로 체험 <i className="fa-solid fa-arrow-right text-xs" />
            </Link>
          )}
          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              ['지금 빈 자리', summary ? `${empty}` : '—', '면'],
              ['전체 점유율', summary ? pct(summary.rate, 0) : '—', ''],
              ['관제 CCTV', '8', '대'],
            ].map(([k, v, unit]) => (
              <div key={k}>
                <dt className="text-[13px] text-slate-400">{k}</dt>
                <dd className="pp-num mt-1 text-[30px] font-extrabold text-white md:text-[34px]">{v}<span className="ml-1 text-base font-semibold text-slate-400">{unit}</span></dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-5">
          <LedSign rows={rows} className="animate-float" footer="parkpick SMART TOWER · ENTRANCE GATE 1" />
        </div>
      </div>
      <div className="bg-hazard h-2 opacity-90" />
    </section>
  )
}

function SectionTitle({ eyebrow, title, desc, light = false, children }) {
  return (
    <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className={`pp-eyebrow ${light ? '!text-sign-400' : ''}`}><span className={`h-px w-8 ${light ? 'bg-sign-400' : 'bg-brand-600'}`} />{eyebrow}</p>
        <h2 className={`pp-h2 mt-4 ${light ? '!text-white' : ''}`}>{title}</h2>
        {desc && <p className={`mt-3 leading-relaxed ${light ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Features() {
  return (
    <section className="section-pp container-pp">
      <SectionTitle eyebrow="SERVICE" title="운전자와 운영사, 모두를 위한 4가지 핵심 기능" desc="하나의 AI 분석 결과로 운전자에게는 안내를, 운영사에게는 관제와 인사이트를 제공합니다." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Link key={f.to} to={f.to} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10">
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
              <img src={unsplash(f.image, 720)} alt="" loading="lazy" className="img-cover opacity-90 transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent" />
              <span className="absolute left-4 top-4 font-mono text-[12px] font-bold tracking-widest text-white/80">0{i + 1}</span>
              <span className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-xl bg-sign-400 text-ink-900 shadow-lg"><i className={`fa-solid ${f.icon}`} /></span>
            </div>
            <div className="p-6">
              <h3 className="pp-h3">{f.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">{f.desc}</p>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900">바로가기 <i className="fa-solid fa-arrow-right text-xs transition group-hover:translate-x-1" /></p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function AiVision() {
  const spaces = useApi('/api/parking/spaces?floor=B1')
  useParkingStream((msg) => {
    if (msg.type !== 'space_update') return
    spaces.setData((list) => list?.map((s) => (s.code === msg.space.code ? { ...s, ...msg.space } : s)))
  })
  const zoneA = useMemo(() => (spaces.data || []).filter((s) => s.zone === 'A'), [spaces.data])
  return (
    <section className="section-pp relative overflow-hidden bg-ink-900 text-white">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="container-pp relative">
        <SectionTitle light eyebrow="AI VISION" title="지금 이 순간, AI가 보고 있는 주차장"
          desc="실제 주차면 점유 데이터가 반영된 CCTV 분석 화면입니다. 이동체마다 추적 ID가 유지되고, 번호판과 얼굴은 자동으로 블러 처리됩니다.">
          <Link to="/monitor" className="btn-glass shrink-0">관제 화면에서 전체 보기 <i className="fa-solid fa-arrow-right" /></Link>
        </SectionTitle>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-gradient-to-b from-white/15 to-white/5 p-1.5">
              <VideoAnalysisView camera="CCTV-B1-A" spaces={zoneA} masked />
            </div>
          </div>
          <ol className="relative space-y-1 lg:col-span-4">
            <span className="absolute bottom-24 left-[31px] top-8 w-px bg-gradient-to-b from-sign-400 via-led to-brand-400" aria-hidden />
            {PIPELINE.map((p, i) => (
              <li key={p.title} className="relative flex gap-4 rounded-xl p-2 transition hover:bg-white/5">
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-ink-800 text-sign-400"><i className={`fa-solid ${p.icon}`} /></span>
                <div className="pt-1">
                  <p className="font-mono text-[11px] font-bold tracking-widest text-slate-500">STEP 0{i + 1}</p>
                  <h3 className="mt-0.5 font-heading text-[17px] font-bold !text-white">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
                </div>
              </li>
            ))}
            <li className="pt-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 [&_li]:!text-slate-300"><StatusLegend /></div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}

function Range({ label, value, min, max, step, unit, onChange }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-medium text-slate-600">
        {label}
        <b className="pp-num text-lg text-slate-900">{value.toLocaleString()}<span className="ml-0.5 text-sm font-semibold text-slate-400">{unit}</span></b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-brand-600" aria-label={label} />
      <span className="mt-1 flex justify-between font-mono text-[11px] text-slate-400"><span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span></span>
    </label>
  )
}

// 차별화: 도입 효과(ROI·ESG) 시뮬레이터 — 배회 주행 감소에 따른 시간·탄소 절감 추정
function ImpactCalculator() {
  const [cars, setCars] = useState(1500)
  const [search, setSearch] = useState(8)
  const r = useMemo(() => {
    const savedMin = cars * search * SAVE_RATE * 365
    const km = (savedMin / 60) * CRUISE_KMH
    const co2 = km * CO2_KG_PER_KM
    return { hours: Math.round(savedMin / 60), km: Math.round(km), co2: (co2 / 1000).toFixed(1), pines: Math.round(co2 / PINE_KG_PER_YEAR) }
  }, [cars, search])
  const metrics = [
    ['fa-hourglass-half', '연간 절감 탐색 시간', r.hours.toLocaleString(), '시간', 'text-brand-600'],
    ['fa-road', '연간 배회 주행 감소', r.km.toLocaleString(), 'km', 'text-slate-900'],
    ['fa-leaf', '연간 CO₂ 감축', r.co2, '톤', 'text-emerald-600'],
    ['fa-tree', '소나무 식재 효과', r.pines.toLocaleString(), '그루', 'text-emerald-700'],
  ]
  return (
    <section className="section-pp bg-white">
      <div className="container-pp">
        <SectionTitle eyebrow="IMPACT SIMULATOR" title="우리 주차장에 도입하면 얼마나 달라질까요?"
          desc="하루 입차 대수와 평균 주차면 탐색 시간을 입력하면, AI 유도로 줄어드는 배회 주행과 탄소 배출을 바로 계산합니다." />
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 lg:grid-cols-12">
          <div className="space-y-8 bg-slate-50 p-8 md:p-10 lg:col-span-5">
            <Range label="하루 입차 대수" value={cars} min={100} max={10000} step={100} unit="대" onChange={setCars} />
            <Range label="평균 주차면 탐색 시간" value={search} min={2} max={20} step={1} unit="분" onChange={setSearch} />
            <p className="rounded-xl bg-white p-4 text-[12.5px] leading-relaxed text-slate-500 ring-1 ring-slate-200">
              <i className="fa-solid fa-circle-info mr-1 text-brand-500" />
              가정: AI 유도 시 탐색 시간 {SAVE_RATE * 100}% 절감 · 배회 속도 {CRUISE_KMH}km/h · 승용차 CO₂ {CO2_KG_PER_KM * 1000}g/km · 소나무 1그루 연 {PINE_KG_PER_YEAR}kg 흡수 (추정치)
            </p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:col-span-7">
            {metrics.map(([icon, label, value, unit, tone]) => (
              <div key={label} className="flex flex-col justify-between gap-6 bg-white p-8">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600"><i className={`fa-solid ${icon}`} /></span>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`pp-num mt-1 text-[34px] font-extrabold leading-none md:text-[40px] ${tone}`}>{value}<span className="ml-1 text-base font-semibold text-slate-400">{unit}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function UseCases() {
  return (
    <section className="section-pp container-pp">
      <SectionTitle eyebrow="USE CASES" title="공간의 성격에 맞춘 주차관제" desc="기존 CCTV 인프라 위에 AI 분석 계층만 더해, 시설 유형별 운영 과제를 해결합니다." />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c, i) => (
          <article key={c.title} className={`group relative isolate flex min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl bg-ink-900 p-8 text-white ${i === 0 ? 'lg:row-span-2 lg:min-h-[660px]' : ''} ${i === 3 ? 'lg:col-span-2' : ''}`}>
            <img src={unsplash(c.image, i === 0 ? 1200 : 960)} alt="" loading="lazy" className="img-cover absolute inset-0 -z-20 transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/10" />
            <span className="absolute left-8 top-8 rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-sign-300 backdrop-blur">{c.tag}</span>
            <h3 className="font-heading text-[26px] font-bold !text-white">{c.title}</h3>
            <p className="mt-2 max-w-md text-slate-300">{c.desc}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {c.points.map((p) => <li key={p} className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[13px] text-slate-200"><i className="fa-solid fa-check mr-1.5 text-led" />{p}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function Trust() {
  const items = [
    ['fa-shield-halved', '개인정보 보호 설계', '번호판·얼굴 자동 블러, 테스트 관리자 읽기 전용·마스킹'],
    ['fa-database', 'K-AI 공공 데이터 학습', 'AI Hub 주차 이동체 영상으로 학습한 탐지 모델'],
    ['fa-plug-circle-bolt', '기존 CCTV 그대로', 'RTSP 스트림 연동, 추가 센서 없이 도입'],
    ['fa-wand-magic-sparkles', '생성형 AI 리포트', 'Gemini가 운영 지표를 해석해 개선안을 제안'],
  ]
  return (
    <section className="container-pp">
      <div className="grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([icon, title, desc]) => (
          <div key={title} className="bg-white p-7">
            <i className={`fa-solid ${icon} text-xl text-brand-600`} />
            <h3 className="mt-4 font-heading text-[17px] font-bold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { data: summary } = useLiveSummary()
  return (
    <>
      <Hero summary={summary} user={user} />
      <Features />
      <AiVision />
      <ImpactCalculator />
      <UseCases />
      <Trust />
    </>
  )
}
