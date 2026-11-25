import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useParkingStream } from '../lib/realtime'
import { STATUS } from '../lib/config'
import ParkingMap from '../components/ParkingMap'
import { ErrorBox, PageHero, Spinner, StatusLegend } from '../components/ui'

const KINDS = [
  { id: 'normal', label: '일반', icon: 'fa-car' },
  { id: 'disabled', label: '장애인 전용', icon: 'fa-wheelchair' },
  { id: 'ev', label: '전기차 충전', icon: 'fa-charging-station' },
]

function steps(route, code) {
  if (!route) return []
  const [, , turn, aisle] = route
  const zone = code.slice(3, 4)
  return [
    '입구(IN) 진입 후 세로 통로로 직진합니다.',
    turn.y > 300 ? '안쪽 가로 통로(C·D 구역 방면)까지 직진 후 우회전합니다.' : '첫 번째 가로 통로(A·B 구역 방면)에서 우회전합니다.',
    `통로를 따라 ${aisle.x > 500 ? '안쪽으로' : '입구 쪽'} 이동해 ${zone}구역 ${Number(code.slice(4))}번 주차면에 주차합니다.`,
  ]
}

export default function Guide() {
  const [floor, setFloor] = useState('')
  const [kind, setKind] = useState('normal')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const lot = useApi('/api/parking/lot')
  const spaces = useApi('/api/parking/spaces')

  const recommend = useCallback(() => {
    const q = new URLSearchParams({ kind, ...(floor ? { floor } : {}) })
    api.get(`/api/parking/guidance?${q}`).then(setResult).catch(setError)
  }, [floor, kind])
  useEffect(recommend, [recommend])

  useParkingStream((msg) => {
    if (msg.type !== 'space_update') return
    spaces.setData((list) => list?.map((s) => (s.code === msg.space.code ? { ...s, ...msg.space } : s)))
    // 추천 주차면이 점유되면 자동으로 재추천
    if (result?.space?.code === msg.space.code && msg.space.status === 'occupied') recommend()
  })

  const targetFloor = result?.space?.floor || floor || 'B1'
  const floorSpaces = useMemo(() => (spaces.data || []).filter((s) => s.floor === targetFloor), [spaces.data, targetFloor])

  if (error || lot.error) return <div className="container-pp py-16"><ErrorBox message={(error || lot.error).message} onRetry={() => { setError(null); recommend() }} /></div>

  return (
    <>
      <PageHero image="garagePillar" eyebrow="PARKING GUIDANCE" icon="fa-route" title="주차 유도" desc="입구에서 가장 가까운 빈 주차면을 실시간으로 추천하고 진입 경로를 안내합니다." />
      <div className="container-pp py-10">
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-4">
          <div className="card">
            <h2 className="pp-h3">조건 선택</h2>
            <p className="label mt-5">주차면 유형</p>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)} className={`btn flex-col !gap-1 !py-3 text-[13px] ${kind === k.id ? 'bg-brand-600 text-white' : 'btn-outline'}`}>
                  <i className={`fa-solid ${k.icon} text-lg`} /> {k.label}
                </button>
              ))}
            </div>
            <p className="label mt-5">층 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {[['', '전체'], ['B1', 'B1층'], ['B2', 'B2층']].map(([v, label]) => (
                <button key={label} onClick={() => setFloor(v)} className={`btn !py-2 ${floor === v ? 'bg-slate-900 text-white' : 'btn-outline'}`}>{label}</button>
              ))}
            </div>
            <button className="btn-primary mt-6 w-full" onClick={recommend}><i className="fa-solid fa-rotate" /> 다시 추천받기</button>
          </div>

          <div className="card">
            {!result ? <Spinner /> : !result.found ? (
              <p className="text-center text-slate-500"><i className="fa-solid fa-ban mr-1" />{result.message}</p>
            ) : (
              <>
                <p className="pp-caption">추천 주차면</p>
                <p className="mt-1 font-heading text-[40px] font-bold text-brand-600">{result.space.code}</p>
                <p className="text-sm text-slate-500">
                  {result.space.floor}층 {result.space.zone}구역 · {result.space.kind === 'normal' ? '일반' : STATUS[result.space.kind].label} · 입구에서 약 {Math.round(result.distance / 10)}m
                </p>
                {result.fallback && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">선택한 유형의 빈 자리가 없어 일반 주차면을 추천했습니다.</p>}
                <ol className="mt-5 space-y-3">
                  {steps(result.route, result.space.code).map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>{s}
                    </li>
                  ))}
                </ol>
                {result.alternatives?.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <p className="pp-caption mb-2">대안 주차면</p>
                    <div className="flex flex-wrap gap-2">
                      {result.alternatives.map((a) => <span key={a.code} className="badge bg-emerald-50 text-emerald-700">{a.code} · {Math.round(a.distance / 10)}m</span>)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <section className="card lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="pp-h3">{targetFloor}층 유도 경로</h2>
            <StatusLegend keys={['empty', 'occupied', 'disabled', 'ev', 'reserved']} />
          </div>
          {spaces.loading && !spaces.data ? <Spinner /> : (
            <ParkingMap spaces={floorSpaces} map={lot.data?.map} entrance={lot.data?.entrance} highlight={result?.space?.code} route={result?.found ? result.route : null} />
          )}
          <p className="pp-caption mt-3"><i className="fa-solid fa-circle-info mr-1" />추천 주차면이 다른 차량에 점유되면 자동으로 다시 추천합니다.</p>
        </section>
      </div>
      </div>
    </>
  )
}
