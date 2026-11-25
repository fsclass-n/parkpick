import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../lib/useApi'
import { useParkingStream } from '../lib/realtime'
import { EVENT_LABEL, STATUS } from '../lib/config'
import { elapsed, formatDateTime, pct } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import ParkingMap from '../components/ParkingMap'
import VideoAnalysisView from '../components/VideoAnalysisView'
import { ErrorBox, KpiCard, PageHero, SEVERITY, Spinner, StatusLegend } from '../components/ui'

const THEME_KEY = 'parkpick.monitor.dark'

export default function Monitor() {
  const { user } = useAuth()
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) !== 'false')
  const [floor, setFloor] = useState('B1')
  const [zone, setZone] = useState('A')
  const [selected, setSelected] = useState(null)
  const lot = useApi('/api/parking/lot')
  const spaces = useApi('/api/parking/spaces')
  const events = useApi('/api/parking/events/recent?limit=20')

  const connected = useParkingStream((msg) => {
    if (msg.type === 'space_update') {
      spaces.setData((list) => list?.map((s) => (s.code === msg.space.code ? { ...s, ...msg.space } : s)))
      setSelected((s) => (s?.code === msg.space.code ? { ...s, ...msg.space } : s))
    } else if (msg.type === 'event') {
      events.setData((list) => [msg.event, ...(list || [])].slice(0, 20))
    } else if (msg.type === 'event_update' && msg.event.status === 'resolved') {
      events.setData((list) => list?.filter((e) => e.id !== msg.event.id))
    }
  })

  // 다크 테마일 때 페이지 하단 여백까지 어둡게 유지
  useEffect(() => {
    document.body.classList.toggle('bg-ink-950', dark)
    return () => { document.body.classList.remove('bg-ink-950') }
  }, [dark])

  const toggleTheme = () => {
    localStorage.setItem(THEME_KEY, String(!dark))
    setDark(!dark)
  }

  const floorSpaces = useMemo(() => (spaces.data || []).filter((s) => s.floor === floor), [spaces.data, floor])
  const alerts = useMemo(() => new Set((events.data || []).map((e) => e.space_code).filter(Boolean)), [events.data])
  const stats = useMemo(() => {
    const all = spaces.data || []
    const occ = all.filter((s) => s.status === 'occupied').length
    const fOcc = floorSpaces.filter((s) => s.status === 'occupied').length
    return { total: all.length, occ, rate: all.length ? occ / all.length : 0, fEmpty: floorSpaces.length - fOcc, fRate: floorSpaces.length ? fOcc / floorSpaces.length : 0 }
  }, [spaces.data, floorSpaces])

  if (spaces.error || lot.error) return <div className="container-pp py-16"><ErrorBox message={(spaces.error || lot.error).message} onRetry={() => { lot.reload(); spaces.reload() }} /></div>

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 pb-10 transition-colors dark:bg-ink-950">
        <PageHero image="garageCars" eyebrow="CONTROL ROOM · LIVE" icon="fa-display" title="실시간 관제" desc={lot.data ? `${lot.data.name} · ${lot.data.address}` : '주차장 정보를 불러오는 중'}>
            <span className={`badge ${connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? 'animate-blink bg-emerald-500' : 'bg-slate-400'}`} /> {connected ? '실시간 연결됨' : '연결 대기 중'}
            </span>
            <button className="btn-glass" onClick={toggleTheme}>
              <i className={`fa-solid ${dark ? 'fa-sun' : 'fa-moon'}`} /> {dark ? '라이트 테마' : '다크 테마'}
            </button>
        </PageHero>
        <div className="container-pp pt-8">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon="fa-square-parking" label="전체 점유율" value={pct(stats.rate)} sub={`${stats.occ} / ${stats.total}면`} />
            <KpiCard icon="fa-layer-group" tone="green" label={`${floor}층 빈 자리`} value={`${stats.fEmpty}면`} sub={`${floor}층 점유율 ${pct(stats.fRate)}`} />
            <KpiCard icon="fa-triangle-exclamation" tone="orange" label="미처리 이상 이벤트" value={`${events.data?.length ?? 0}건`} sub="장기·불법 주차, 역주행" />
            <KpiCard icon="fa-video" tone="cyan" label="분석 중인 CCTV" value="8대" sub="YOLO + ByteTrack" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <section className="card lg:col-span-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2" role="tablist">
                  {(lot.data?.floors || ['B1', 'B2']).map((f) => (
                    <button key={f} role="tab" aria-selected={floor === f} onClick={() => { setFloor(f); setSelected(null) }}
                      className={`btn !py-2 ${floor === f ? 'bg-brand-600 text-white' : 'btn-outline'}`}>{f}층</button>
                  ))}
                </div>
                <StatusLegend />
              </div>
              {spaces.loading && !spaces.data ? <Spinner /> : (
                <ParkingMap spaces={floorSpaces} map={lot.data?.map} entrance={lot.data?.entrance} alerts={alerts} highlight={selected?.code} onSelect={setSelected} />
              )}
              {selected && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-200">
                  <span className="font-heading text-base font-bold">{selected.code}</span>
                  <span><i className="fa-solid fa-circle mr-1 text-[10px]" style={{ color: STATUS[selected.status === 'occupied' ? 'occupied' : 'empty'].color }} />{STATUS[selected.status === 'occupied' ? 'occupied' : 'empty'].label}</span>
                  <span>유형: {selected.kind === 'normal' ? '일반' : STATUS[selected.kind].label}</span>
                  {selected.status === 'occupied' && <span>주차 경과: {elapsed(selected.occupied_since)}</span>}
                  <span className="pp-caption">갱신 {formatDateTime(selected.updated_at)}</span>
                </div>
              )}
            </section>

            <section className="card flex flex-col lg:col-span-4">
              <h2 className="pp-h3 flex items-center gap-2"><i className="fa-solid fa-bell text-st-alert" /> 이벤트 관제</h2>
              <ul className="mt-4 max-h-[520px] flex-1 space-y-3 overflow-y-auto pr-1">
                {(events.data || []).length === 0 && <li className="py-10 text-center text-sm text-slate-400">미처리 이벤트가 없습니다.</li>}
                {(events.data || []).map((e) => (
                  <li key={`${e.id}-${e.created_at}`} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className={`badge ${SEVERITY[e.severity]}`}>{EVENT_LABEL[e.kind]}</span>
                      <span className="pp-caption">{formatDateTime(e.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium dark:text-slate-200">{e.message}</p>
                    <p className="pp-caption mt-1">{e.space_code || '-'} · {e.camera} · {e.plate}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="pp-h3 flex items-center gap-2"><i className="fa-solid fa-video text-brand-500" /> 영상 분석 뷰</h2>
              <div className="flex flex-wrap gap-2">
                {['A', 'B', 'C', 'D'].map((z) => (
                  <button key={z} onClick={() => setZone(z)} className={`btn !px-3 !py-1.5 text-[13px] ${zone === z ? 'bg-slate-900 text-white dark:bg-brand-600' : 'btn-outline'}`}>
                    CCTV-{floor}-{z}
                  </button>
                ))}
              </div>
            </div>
            <VideoAnalysisView camera={`CCTV-${floor}-${zone}`} spaces={floorSpaces.filter((s) => s.zone === zone)} masked={user?.role !== 'admin'} />
          </section>
        </div>
      </div>
    </div>
  )
}
