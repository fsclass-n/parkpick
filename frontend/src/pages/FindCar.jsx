import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { elapsed, formatDateTime } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import ParkingMap from '../components/ParkingMap'
import { PageHeader } from '../components/ui'

export default function FindCar() {
  const { user } = useAuth()
  const [plate, setPlate] = useState(user?.plate || '')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lot = useApi('/api/parking/lot')
  const spaces = useApi(result?.found ? `/api/parking/spaces?floor=${result.space.floor}` : null)

  useEffect(() => {
    if (user?.plate) setPlate(user.plate)
  }, [user?.plate])

  const search = async (e) => {
    e?.preventDefault()
    const value = plate.replace(/\s/g, '')
    if (!/^\d{2,3}[가-힣]\d{4}$/.test(value)) return setError('차량 번호 형식을 확인해 주세요. (예: 12가3456)')
    setBusy(true)
    setError('')
    try {
      setResult(await api.get(`/api/parking/find-car?plate=${encodeURIComponent(value)}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const floorSpaces = useMemo(() => spaces.data || [], [spaces.data])

  return (
    <div className="container-pp py-10">
      <PageHeader icon="fa-magnifying-glass-location" title="내 차 찾기" desc="CCTV 번호판 인식(OCR) 결과를 기반으로 차량의 주차 위치를 찾아드립니다." />
      <form onSubmit={search} className="card flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="plate">차량 번호</label>
          <input id="plate" className="input !text-lg tracking-wider" placeholder="12가3456" value={plate} onChange={(e) => setPlate(e.target.value)} />
        </div>
        <button className="btn-primary !py-3 md:w-40" disabled={busy}>
          {busy ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-magnifying-glass" />} 위치 조회
        </button>
      </form>
      <p className="pp-caption mt-2">테스트 차량 번호: <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => setPlate('12가3456')}>12가3456</button></p>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && !result.found && (
        <div className="card mt-6 text-center text-slate-500"><i className="fa-solid fa-car-burst mb-3 block text-3xl text-slate-300" />{result.message}</div>
      )}
      {result?.found && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="card lg:col-span-4">
            <p className="pp-caption">{result.plate} 차량 위치</p>
            <p className="mt-1 font-heading text-[40px] font-bold text-brand-600">{result.space.code}</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['층 / 구역', `${result.space.floor}층 ${result.space.zone}구역`],
                ['입차 시각', formatDateTime(result.parked_since)],
                ['주차 경과', elapsed(result.parked_since)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="pp-caption mt-4"><i className="fa-solid fa-person-walking mr-1" />지도에 표시된 경로는 입구(IN) 기준 보행 동선입니다.</p>
          </div>
          <div className="card lg:col-span-8">
            <ParkingMap spaces={floorSpaces} map={lot.data?.map} entrance={lot.data?.entrance} highlight={result.space.code} route={result.route} />
          </div>
        </div>
      )}
    </div>
  )
}
