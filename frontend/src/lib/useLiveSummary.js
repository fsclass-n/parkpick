import { useApi } from './useApi'
import { useParkingStream } from './realtime'

// /api/parking/summary 를 불러온 뒤 WebSocket space_update 로 전체·층별 점유 수치를 실시간 보정
export function useLiveSummary() {
  const summary = useApi('/api/parking/summary')
  const connected = useParkingStream((msg) => {
    if (msg.type !== 'space_update') return
    const delta = msg.space.status === 'occupied' ? 1 : -1
    const apply = (g) => {
      const occupied = Math.min(g.total, Math.max(0, g.occupied + delta))
      return { ...g, occupied, empty: g.total - occupied, rate: g.total ? occupied / g.total : 0 }
    }
    summary.setData((s) => s && {
      ...apply(s),
      by_floor: s.by_floor.map((f) => (f.floor === msg.space.floor ? apply(f) : f)),
      by_kind: s.by_kind,
    })
  })
  return { ...summary, connected }
}
