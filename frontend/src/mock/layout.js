// backend/app/services/layout.py 와 동일한 도면 규칙 (Mock 데모용)
export const FLOORS = ['B1', 'B2']
export const ZONES = ['A', 'B', 'C', 'D']
export const SPACES_PER_ZONE = 12
export const SPACE_W = 50
export const SPACE_H = 80
export const MAP = { width: 960, height: 580, space_w: SPACE_W, space_h: SPACE_H }
export const ENTRANCE = { x: 40, y: 160 }
const SPINE_X = 90
const ZONE_Y = { A: 40, B: 200, C: 300, D: 460 }
const AISLE_Y = { A: 160, B: 160, C: 420, D: 420 }
const FLOOR_PENALTY = { B1: 0, B2: 300 }

function spaceKind(zone, idx) {
  if (zone === 'A' && idx < 2) return 'disabled'
  if (zone === 'D' && idx >= SPACES_PER_ZONE - 2) return 'ev'
  if (zone === 'B' && idx === 0) return 'reserved'
  return 'normal'
}

export function iterLayout() {
  const items = []
  for (const floor of FLOORS)
    for (const zone of ZONES)
      for (let idx = 0; idx < SPACES_PER_ZONE; idx++)
        items.push({
          floor,
          zone,
          code: `${floor}-${zone}${String(idx + 1).padStart(2, '0')}`,
          kind: spaceKind(zone, idx),
          x: 140 + idx * 60,
          y: ZONE_Y[zone],
        })
  return items
}

export function routeTo(space) {
  const cx = space.x + SPACE_W / 2
  const cy = space.y + SPACE_H / 2
  const aisleY = AISLE_Y[space.zone]
  const points = [ENTRANCE, { x: SPINE_X, y: ENTRANCE.y }, { x: SPINE_X, y: aisleY }, { x: cx, y: aisleY }, { x: cx, y: cy }]
  const distance = points.slice(1).reduce((sum, p, i) => sum + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y), 0)
  return { points, distance: distance + (FLOOR_PENALTY[space.floor] || 0) }
}
