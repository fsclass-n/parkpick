import { useState } from 'react'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { formatDateTime, pct } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { EmptyState, Spinner } from '../../components/ui'

const ACTION_LABEL = {
  'user.role_change': '권한 변경', 'user.delete': '회원 삭제', 'event.status': '이벤트 처리', 'space.update': '주차면 수정',
  'camera.create': '카메라 등록', 'camera.update': '카메라 수정', 'camera.delete': '카메라 삭제',
  'model.create': '모델 등록', 'model.activate': '모델 적용', 'report.create': '리포트 생성', 'report.delete': '리포트 삭제',
}

function Cameras() {
  const { isTestAdmin, guardWrite } = useAuth()
  const toast = useToast()
  const { data, setData } = useApi('/api/admin/cameras')
  const [form, setForm] = useState({ name: '', floor: 'B1', zone: 'A', stream_url: '' })

  const create = guardWrite(async (e) => {
    e?.preventDefault?.()
    if (!form.name.trim()) return toast('카메라 이름을 입력해 주세요.', 'error')
    const cam = await api.post('/api/admin/cameras', { ...form, stream_url: form.stream_url || null, roi: [] })
    setData((list) => [...(list || []), cam])
    setForm({ ...form, name: '', stream_url: '' })
    toast('카메라를 등록했습니다.', 'success')
  })
  const remove = guardWrite(async (cam) => {
    if (!confirm(`${cam.name} 카메라를 삭제할까요?`)) return
    await api.del(`/api/admin/cameras/${cam.id}`)
    setData((list) => list.filter((c) => c.id !== cam.id))
    toast('카메라를 삭제했습니다.', 'success')
  })

  return (
    <section className="card">
      <h2 className="pp-h3"><i className="fa-solid fa-video mr-2 text-brand-500" />CCTV 카메라 · ROI</h2>
      <form className="mt-4 grid gap-2 md:grid-cols-[1fr_90px_90px_1fr_auto]" onSubmit={create}>
        <input className="input" placeholder="카메라 이름" value={form.name} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="input" value={form.floor} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, floor: e.target.value })}>{['B1', 'B2'].map((f) => <option key={f}>{f}</option>)}</select>
        <select className="input" value={form.zone} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, zone: e.target.value })}>{['A', 'B', 'C', 'D'].map((z) => <option key={z}>{z}</option>)}</select>
        <input className="input" placeholder="RTSP / 영상 URL (선택)" value={form.stream_url} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
        <button className={isTestAdmin ? 'btn-outline opacity-60' : 'btn-primary'}><i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-plus'}`} /> 등록</button>
      </form>
      {!data ? <Spinner /> : (
        <div className="mt-4 overflow-x-auto">
          <table className="table-pp min-w-[560px]">
            <thead><tr><th>이름</th><th>위치</th><th>ROI 주차면</th><th>상태</th><th className="text-right">관리</th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.floor}층 {c.zone}구역</td>
                  <td>{c.roi?.length ?? 0}면</td>
                  <td><span className={`badge ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.active ? '분석 중' : '중지'}</span></td>
                  <td className="text-right"><button className="btn-ghost !px-3 !py-1.5 !text-red-600" onClick={() => remove(c)} aria-label="삭제"><i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-trash'}`} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Models() {
  const { isTestAdmin, guardWrite } = useAuth()
  const toast = useToast()
  const { data, setData } = useApi('/api/admin/models')
  const activate = guardWrite(async (model) => {
    await api.patch(`/api/admin/models/${model.id}/activate`)
    setData((list) => list.map((m) => ({ ...m, active: m.id === model.id })))
    toast(`${model.version} 모델을 적용했습니다.`, 'success')
  })
  return (
    <section className="card">
      <h2 className="pp-h3"><i className="fa-solid fa-brain mr-2 text-brand-500" />AI 모델 버전 · 탐지 임계값</h2>
      <p className="pp-caption mt-1">ai/train.py 학습 결과(ai/runs/metrics.json)를 신규 버전으로 등록해 적용합니다.</p>
      {!data ? <Spinner /> : (
        <ul className="mt-4 space-y-3">
          {data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
              <div>
                <p className="font-semibold">{m.version} {m.active && <span className="badge ml-1 bg-brand-100 text-brand-700">적용 중</span>}</p>
                <p className="pp-caption mt-1">mAP50 {pct(m.metrics.mAP50)} · Precision {pct(m.metrics.precision)} · Recall {pct(m.metrics.recall)} · 임계값 {m.conf_threshold}</p>
              </div>
              {!m.active && <button className={isTestAdmin ? 'btn-outline opacity-60' : 'btn-outline'} onClick={() => activate(m)}>{isTestAdmin && <i className="fa-solid fa-lock" />} 이 버전 적용</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AuditLogs() {
  const { data } = useApi('/api/admin/audit-logs')
  return (
    <section className="card lg:col-span-2">
      <h2 className="pp-h3"><i className="fa-solid fa-clipboard-list mr-2 text-brand-500" />감사 로그 (Audit Log)</h2>
      <p className="pp-caption mt-1">관리자의 권한 변경 · 데이터 삭제 · 설정 변경 작업 기록</p>
      {!data ? <Spinner /> : data.length === 0 ? <EmptyState icon="fa-clipboard" message="기록된 관리자 작업이 없습니다." /> : (
        <div className="mt-4 overflow-x-auto">
          <table className="table-pp min-w-[640px]">
            <thead><tr><th>시각</th><th>관리자</th><th>작업</th><th>대상</th><th>상세</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="text-slate-500">{formatDateTime(a.created_at)}</td>
                  <td>{a.actor}</td>
                  <td><span className="badge bg-slate-100 text-slate-700">{ACTION_LABEL[a.action] || a.action}</span></td>
                  <td className="font-medium">{a.target}</td>
                  <td className="font-mono text-[12px] text-slate-500">{Object.keys(a.detail || {}).length ? JSON.stringify(a.detail) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AdminSettings() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cameras />
      <Models />
      <AuditLogs />
    </div>
  )
}
