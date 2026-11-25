import { useApi } from '../lib/useApi'
import { pct } from '../lib/format'
import { DailyTurnoverChart, HourlyTrafficChart, OccupancyDonut } from '../components/Charts'
import ReportPanel from '../components/ReportPanel'
import { ErrorBox, KpiCard, PageHero, Spinner } from '../components/ui'

export default function Reports() {
  const { data, error, loading, reload } = useApi('/api/reports/stats')
  if (error) return <div className="container-pp py-16"><ErrorBox message={error.message} onRetry={reload} /></div>
  const peak = data?.traffic.hourly.reduce((a, b) => (b.congestion > a.congestion ? b : a), { congestion: 0, hour: 0 })

  return (
    <>
      <PageHero image="analytics" eyebrow="OPERATION REPORT" icon="fa-chart-line" title="운영 리포트" desc="pandas·NumPy로 분석한 최근 7일 주차 운영 지표와 Gemini 기반 운영 리포트입니다." />
      <div className="container-pp py-10">
      {loading || !data ? <Spinner /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon="fa-gauge-high" label="현재 점유율" value={pct(data.occupancy.rate)} sub={`${data.occupancy.occupied} / ${data.occupancy.total}면`} />
            <KpiCard icon="fa-arrows-rotate" tone="green" label="일평균 회전율" value={`${data.traffic.turnover}회`} sub="입차 대수 / 전체 주차면" />
            <KpiCard icon="fa-hourglass-half" tone="cyan" label="평균 주차 시간" value={`${Math.round(data.traffic.avg_duration_min)}분`} sub="출차 완료 차량 기준" />
            <KpiCard icon="fa-fire" tone="orange" label="피크 시간대" value={`${peak.hour}시`} sub={`평균 혼잡도 ${pct(peak.congestion)}`} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <section className="card lg:col-span-8">
              <h2 className="pp-h3">시간대별 입출차 · 혼잡도</h2>
              <p className="pp-caption mb-4 mt-1">최근 7일 시간대별 평균</p>
              <HourlyTrafficChart data={data.traffic.hourly} />
            </section>
            <section className="card lg:col-span-4">
              <h2 className="pp-h3">현재 점유 현황</h2>
              <OccupancyDonut occupied={data.occupancy.occupied} empty={data.occupancy.empty} />
              <ul className="mt-2 space-y-2 text-sm">
                {data.occupancy.by_floor.map((f) => (
                  <li key={f.floor} className="flex justify-between"><span>{f.floor}층</span><span className="tabular-nums text-slate-500">{f.occupied}/{f.total}면 · {pct(f.rate)}</span></li>
                ))}
              </ul>
            </section>
            <section className="card lg:col-span-12">
              <h2 className="pp-h3">일별 입차 · 회전율</h2>
              <p className="pp-caption mb-4 mt-1">최근 7일</p>
              <DailyTurnoverChart data={data.traffic.daily} />
            </section>
          </div>
        </>
      )}
      <div className="mt-6"><ReportPanel /></div>
      </div>
    </>
  )
}
