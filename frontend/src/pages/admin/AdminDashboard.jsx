import { useApi } from '../../lib/useApi'
import { pct } from '../../lib/format'
import { ClassAccuracyChart, DailyTurnoverChart, HourlyTrafficChart, OccupancyDonut } from '../../components/Charts'
import { ErrorBox, KpiCard, Spinner } from '../../components/ui'

export default function AdminDashboard() {
  const { data, error, loading, reload } = useApi('/api/admin/dashboard')
  if (error) return <ErrorBox message={error.message} onRetry={reload} />
  if (loading || !data) return <Spinner />
  const { occupancy, traffic, ai } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon="fa-brain" label="이동체 탐지 정확도 (mAP50)" value={pct(ai.mAP50)} sub={`mAP50-95 ${pct(ai.mAP50_95)} · ${ai.version}`} />
        <KpiCard icon="fa-id-card" tone="cyan" label="번호판 인식률" value={pct(traffic.plate_recognition_rate)} sub="OCR 신뢰도 0.85 이상 비율" />
        <KpiCard icon="fa-square-parking" tone="red" label="주차 점유율" value={pct(occupancy.rate)} sub={`${occupancy.occupied} / ${occupancy.total}면`} />
        <KpiCard icon="fa-arrows-rotate" tone="green" label="일평균 회전율" value={`${traffic.turnover}회`} sub={`평균 주차 ${Math.round(traffic.avg_duration_min)}분`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="card lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="pp-h3">시간대별 입출차 및 혼잡도</h2>
            <span className="badge bg-orange-100 text-orange-700">미처리 이벤트 {data.open_events}건</span>
          </div>
          <p className="pp-caption mb-4 mt-1">최근 7일 평균 · pandas 분석</p>
          <HourlyTrafficChart data={traffic.hourly} />
        </section>
        <section className="card lg:col-span-4">
          <h2 className="pp-h3">주차 점유 현황</h2>
          <OccupancyDonut occupied={occupancy.occupied} empty={occupancy.empty} />
          <table className="table-pp mt-2">
            <thead><tr><th>구분</th><th>점유</th><th>점유율</th></tr></thead>
            <tbody>
              {occupancy.by_floor.map((f) => <tr key={f.floor}><td>{f.floor}층</td><td>{f.occupied}/{f.total}</td><td>{pct(f.rate)}</td></tr>)}
            </tbody>
          </table>
        </section>
        <section className="card lg:col-span-7">
          <h2 className="pp-h3">일별 입차 · 회전율</h2>
          <p className="pp-caption mb-4 mt-1">최근 7일</p>
          <DailyTurnoverChart data={traffic.daily} />
        </section>
        <section className="card lg:col-span-5">
          <h2 className="pp-h3">AI 모델 성능</h2>
          <p className="pp-caption mt-1">{ai.version} · 신뢰도 임계값 {ai.conf_threshold}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[['Precision', ai.precision], ['Recall', ai.recall], ['번호판 OCR', ai.plate_accuracy]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="font-heading text-xl font-bold">{pct(v)}</p><p className="pp-caption">{k}</p></div>
            ))}
          </div>
          <p className="pp-caption mb-1 mt-5">클래스별 AP50</p>
          <ClassAccuracyChart classes={ai.classes} />
          {ai.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800"><i className="fa-solid fa-circle-info mr-1" />{ai.note}</p>}
        </section>
      </div>
    </div>
  )
}
