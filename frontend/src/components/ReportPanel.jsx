import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { formatDateTime } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Markdown from './Markdown'
import { EmptyState, Spinner } from './ui'

// AI 운영 리포트 목록·열람 + (관리자) Gemini 리포트 생성/삭제
export default function ReportPanel() {
  const { isAdmin, isTestAdmin, guardWrite } = useAuth()
  const toast = useToast()
  const reports = useApi('/api/reports')
  const [active, setActive] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!active && reports.data?.length) setActive(reports.data[0])
  }, [reports.data, active])

  const generate = guardWrite(async (period) => {
    setBusy(true)
    try {
      const report = await api.post('/api/reports/generate', { period })
      reports.setData((list) => [report, ...(list || [])])
      setActive(report)
      toast(report.source === 'gemini' ? 'Gemini 운영 리포트를 생성했습니다.' : '템플릿 운영 리포트를 생성했습니다. (GEMINI_API_KEY 미설정)', 'success')
    } finally {
      setBusy(false)
    }
  })
  const remove = guardWrite(async (report) => {
    if (!confirm(`'${report.title}' 리포트를 삭제할까요?`)) return
    await api.del(`/api/reports/${report.id}`)
    reports.setData((list) => list.filter((r) => r.id !== report.id))
    setActive(null)
    toast('리포트를 삭제했습니다.', 'success')
  })

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="card lg:col-span-4">
        <div className="flex items-center justify-between">
          <h2 className="pp-h3">AI 운영 리포트</h2>
          {reports.loading && <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />}
        </div>
        {isAdmin && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[['daily', '일간 생성'], ['weekly', '주간 생성']].map(([period, label]) => (
              <button key={period} className={isTestAdmin ? 'btn-outline opacity-60' : 'btn-primary'} disabled={busy} onClick={() => generate(period)}
                title={isTestAdmin ? '테스트 관리자 계정은 읽기 전용입니다' : ''}>
                {isTestAdmin ? <i className="fa-solid fa-lock" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {label}
              </button>
            ))}
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {reports.data?.length === 0 && <EmptyState icon="fa-file-lines" message={isAdmin ? '생성된 리포트가 없습니다. 리포트를 생성해 보세요.' : '아직 발행된 리포트가 없습니다.'} />}
          {reports.data?.map((r) => (
            <li key={r.id}>
              <button onClick={() => setActive(r)} className={`w-full rounded-xl border px-4 py-3 text-left transition ${active?.id === r.id ? 'border-brand-300 bg-brand-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="pp-caption mt-1">{formatDateTime(r.created_at)} · {r.source === 'gemini' ? 'Gemini' : '템플릿'}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card lg:col-span-8">
        {busy ? <Spinner label="Gemini가 운영 데이터를 분석하는 중..." /> : active ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <p className="font-heading text-lg font-bold">{active.title}</p>
                <span className={`badge mt-1 ${active.source === 'gemini' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                  <i className={`fa-solid ${active.source === 'gemini' ? 'fa-wand-magic-sparkles' : 'fa-file-lines'}`} /> {active.source === 'gemini' ? 'Gemini 생성' : '템플릿 생성'}
                </span>
              </div>
              {isAdmin && <button className="btn-ghost !text-red-600" onClick={() => remove(active)}><i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-trash'}`} /> 삭제</button>}
            </div>
            <Markdown text={active.content} />
          </>
        ) : <EmptyState icon="fa-file-lines" message="왼쪽 목록에서 리포트를 선택하세요." />}
      </div>
    </div>
  )
}
