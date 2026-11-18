import { useState } from 'react'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useParkingStream } from '../../lib/realtime'
import { EVENT_LABEL } from '../../lib/config'
import { formatDateTime } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { EmptyState, ErrorBox, SEVERITY, Spinner } from '../../components/ui'

const FILTERS = [['', '전체'], ['open', '미처리'], ['resolved', '처리 완료']]

export default function AdminEvents() {
  const { isTestAdmin, guardWrite } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState('open')
  const { data, error, loading, reload, setData } = useApi(`/api/admin/events${status ? `?status=${status}` : ''}`)

  useParkingStream((msg) => {
    if (msg.type === 'event' && status !== 'resolved') setData((list) => [msg.event, ...(list || [])])
  })

  const toggle = guardWrite(async (event) => {
    const next = event.status === 'open' ? 'resolved' : 'open'
    const updated = await api.patch(`/api/admin/events/${event.id}`, { status: next })
    setData((list) => (status ? list.filter((e) => e.id !== event.id) : list.map((e) => (e.id === event.id ? { ...e, ...updated } : e))))
    toast(next === 'resolved' ? '이벤트를 처리 완료했습니다.' : '이벤트를 다시 열었습니다.', 'success')
  })

  if (error) return <ErrorBox message={error.message} onRetry={reload} />
  return (
    <section className="card !p-0">
      <div className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="pp-h3">이상 이벤트 알림 목록</h2>
          <p className="pp-caption mt-1">장기 주차 · 불법 주차 · 역주행 이벤트를 실시간으로 수신합니다.</p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(([v, label]) => (
            <button key={label} onClick={() => setStatus(v)} className={`btn !py-2 ${status === v ? 'bg-slate-900 text-white' : 'btn-outline'}`}>{label}</button>
          ))}
        </div>
      </div>
      {loading && !data ? <Spinner /> : data?.length === 0 ? <EmptyState icon="fa-circle-check" message="해당 조건의 이벤트가 없습니다." /> : (
        <div className="overflow-x-auto">
          <table className="table-pp min-w-[860px]">
            <thead><tr><th>유형</th><th>내용</th><th>주차면</th><th>차량 번호</th><th>카메라</th><th>발생 시각</th><th className="text-right">처리</th></tr></thead>
            <tbody>
              {data?.map((e) => (
                <tr key={`${e.id}-${e.created_at}`} className="hover:bg-slate-50">
                  <td><span className={`badge ${SEVERITY[e.severity]}`}>{EVENT_LABEL[e.kind]}</span></td>
                  <td className="font-medium">{e.message}</td>
                  <td>{e.space_code || '-'}</td>
                  <td className="font-mono text-[13px]">{e.plate}</td>
                  <td className="text-slate-500">{e.camera}</td>
                  <td className="text-slate-500">{formatDateTime(e.created_at)}</td>
                  <td className="text-right">
                    <button className={`btn !px-3 !py-1.5 text-[13px] ${e.status === 'open' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'btn-outline'} ${isTestAdmin ? 'opacity-60' : ''}`} onClick={() => toggle(e)}>
                      {isTestAdmin && <i className="fa-solid fa-lock" />} {e.status === 'open' ? '처리 완료' : '다시 열기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
