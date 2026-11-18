// Netlify 데모(VITE_USE_MOCK=true)용 브라우저 Mock API. 백엔드 라우트·권한 규칙을 동일하게 모사합니다.
import { ENTRANCE, FLOORS, MAP, iterLayout, routeTo } from './layout'
import { PASSWORD_RE, PASSWORD_RULE } from '../lib/config'

const HANGUL = '가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주하허호'
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(42)
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1))
const randomPlate = () => `${randInt(10, 399)}${HANGUL[randInt(0, HANGUL.length - 1)]}${randInt(1000, 9999)}`
const now = () => new Date().toISOString()
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString()

export class MockError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const db = {
  users: [
    { id: 1, email: 'user@parkpick.com', password: 'User1234!', name: '테스트 사용자', role: 'user', provider: 'local', plate: '12가3456' },
    { id: 2, email: 'testadmin@parkpick.com', password: 'Admin1234!', name: '테스트 관리자', role: 'test_admin', provider: 'local', plate: null },
    { id: 3, email: 'park.mg@parkpick.com', password: 'Member1234!', name: '박미금', role: 'user', provider: 'local', plate: null },
    { id: 4, email: 'kim.mr@parkpick.com', password: 'Member1234!', name: '김모란', role: 'user', provider: 'google', plate: null },
    { id: 5, email: 'lee.or@parkpick.com', password: 'Member1234!', name: '이오리', role: 'user', provider: 'kakao', plate: null },
  ].map((u) => ({ ...u, created_at: minutesAgo(60 * 24 * 7), last_login_at: null })),
  spaces: iterLayout().map((item, i) => {
    const occupied = item.kind !== 'reserved' && rand() < 0.62
    return { id: i + 1, ...item, status: occupied ? 'occupied' : 'empty', plate: occupied ? randomPlate() : null,
      occupied_since: occupied ? minutesAgo(randInt(5, 600)) : null, updated_at: now() }
  }),
  events: [
    ['long_parking', 'high', 'B1-A07', '장기 주차 의심 차량 (24시간 이상 점유)'],
    ['illegal_parking', 'medium', 'B1-A01', '장애인 전용 구역 일반 차량 주차'],
    ['wrong_way', 'high', null, 'B2 가로 통로 역주행 이동체 감지'],
    ['illegal_parking', 'low', 'B2-D12', '전기차 충전 구역 충전 미실시 차량'],
    ['long_parking', 'medium', 'B2-C03', '장기 주차 의심 차량 (12시간 이상 점유)'],
  ].map(([kind, severity, space_code, message], i) => ({
    id: i + 1, kind, severity, space_code, plate: randomPlate(), camera: `CCTV-${(space_code || 'B2-C').slice(0, 2)}-${(space_code || 'B2-C')[3]}`,
    message, status: i === 4 ? 'resolved' : 'open', created_at: minutesAgo(15 * (i + 1)),
  })),
  cameras: FLOORS.flatMap((floor) => ['A', 'B', 'C', 'D'].map((zone) => ({ floor, zone }))).map((c, i) => ({
    id: i + 1, name: `CCTV-${c.floor}-${c.zone}`, ...c, stream_url: null, active: true,
    roi: Array.from({ length: 12 }, (_, k) => ({ space: `${c.floor}-${c.zone}${String(k + 1).padStart(2, '0')}` })),
  })),
  models: [{ id: 1, version: 'yolo-parkpick-v0.1 (sample)', conf_threshold: 0.45, active: true, created_at: minutesAgo(60 * 24 * 3),
    metrics: { mAP50: 0.912, mAP50_95: 0.684, precision: 0.903, recall: 0.871, plate_accuracy: 0.934,
      classes: { car: 0.941, person: 0.872, motorcycle: 0.823 }, note: '샘플 지표 - 모델 학습 후 갱신 예정' } }],
  reports: [],
  audit: [],
}
const demoSpace = db.spaces.find((s) => s.code === 'B1-C05')
Object.assign(demoSpace, { status: 'occupied', plate: '12가3456', occupied_since: minutesAgo(95) })

const HOURLY_WEIGHT = { 8: 3.0, 9: 3.4, 10: 2.0, 11: 2.2, 12: 3.0, 13: 2.8, 14: 1.8, 15: 1.6, 16: 1.7, 17: 2.4, 18: 3.2, 19: 2.6, 20: 1.4 }
const hourly = Array.from({ length: 24 }, (_, hour) => {
  const w = HOURLY_WEIGHT[hour] ?? 0.4
  const entries = +(w * (4 + rand() * 3)).toFixed(1)
  return { hour, entries, exits: +(entries * (0.8 + rand() * 0.3)).toFixed(1), congestion: +Math.min(0.97, 0.12 + w * 0.24 + rand() * 0.05).toFixed(3) }
})
const daily = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(Date.now() - (7 - i) * 86400000).toISOString().slice(0, 10)
  const entries = Math.round(hourly.reduce((s, h) => s + h.entries, 0) * (0.85 + rand() * 0.3))
  return { date, entries, turnover: +(entries / db.spaces.length).toFixed(2) }
})

// ---------- 유틸 ----------
const maskPlate = (p) => (p ? p.replace(/^(\d{2,3}[가-힣])\s?\d{4}$/, '$1 ****') : p)
const maskEmail = (e) => { const [n, d] = e.split('@'); return `${n.slice(0, 2)}${'*'.repeat(Math.max(n.length - 2, 1))}@${d}` }
const publicUser = ({ password, ...u }) => u
const spaceOut = ({ plate, ...s }) => s
const eventOut = (e, masked = true) => ({ ...e, plate: masked ? maskPlate(e.plate) : e.plate })
const issue = (user) => {
  user.last_login_at = now()
  return { access_token: `mock.${user.id}.${Date.now()}`, token_type: 'bearer', user: publicUser(user) }
}
const audit = (actor, action, target, detail = {}) =>
  db.audit.unshift({ id: db.audit.length + 1, actor: actor.email, action, target, detail, created_at: now() })

function occupancy() {
  const group = (key) => Object.values(db.spaces.reduce((acc, s) => {
    const g = (acc[s[key]] ||= { [key]: s[key], total: 0, occupied: 0 })
    g.total++
    g.occupied += s.status === 'occupied'
    return acc
  }, {})).map((g) => ({ ...g, empty: g.total - g.occupied, rate: +(g.occupied / g.total).toFixed(3) }))
  const occupied = db.spaces.filter((s) => s.status === 'occupied').length
  return { total: db.spaces.length, occupied, empty: db.spaces.length - occupied, rate: +(occupied / db.spaces.length).toFixed(3),
    by_floor: group('floor'), by_kind: group('kind') }
}
const traffic = () => ({ hourly, daily, avg_duration_min: 142.6, turnover: +(daily.reduce((s, d) => s + d.turnover, 0) / 7).toFixed(2), plate_recognition_rate: 0.948 })
const dashboard = () => {
  const m = db.models.find((x) => x.active)
  return { occupancy: occupancy(), traffic: traffic(), ai: { version: m.version, conf_threshold: m.conf_threshold, ...m.metrics },
    open_events: db.events.filter((e) => e.status === 'open').length }
}

function templateReport(period) {
  const o = occupancy()
  const t = traffic()
  const peak = t.hourly.reduce((a, b) => (b.congestion > a.congestion ? b : a))
  const label = period === 'daily' ? '일간' : '주간'
  return `## ${label} 주차장 운영 리포트

### 1. 운영 현황 요약
- 전체 ${o.total}면 중 ${o.occupied}면 점유 (점유율 ${(o.rate * 100).toFixed(1)}%)
${o.by_floor.map((f) => `- ${f.floor}: ${f.occupied}/${f.total}면 점유 (${(f.rate * 100).toFixed(1)}%)`).join('\n')}
- 평균 주차 시간 ${t.avg_duration_min}분, 일평균 회전율 ${t.turnover}회

### 2. 혼잡도 분석
- 가장 혼잡한 시간대는 ${peak.hour}시 (평균 혼잡도 ${(peak.congestion * 100).toFixed(1)}%)입니다.
- 피크 시간대 전후 30분 동안 B2층 유도 안내를 강화하면 B1층 대기 차량을 분산할 수 있습니다.

### 3. AI 인식 품질
- 번호판 인식률 ${(t.plate_recognition_rate * 100).toFixed(1)}% (신뢰도 0.85 이상 기준)

### 4. 이상 이벤트 및 권고 사항
- 미처리 이상 이벤트 ${db.events.filter((e) => e.status === 'open').length}건: 장기·불법 주차 차량 현장 확인을 권장합니다.

> Netlify 데모(Mock) 환경에서 생성된 템플릿 리포트입니다.`
}

function guidance(params) {
  const floor = params.get('floor')
  const kind = params.get('kind') || 'normal'
  const pick = (k) => db.spaces.filter((s) => s.status === 'empty' && s.kind === k && (!floor || s.floor === floor))
  let candidates = pick(kind)
  const fallback = !candidates.length && kind !== 'normal'
  if (fallback) candidates = pick('normal')
  if (!candidates.length) return { found: false, message: '현재 이용 가능한 빈 주차면이 없습니다.' }
  const ranked = candidates.map((s) => ({ s, r: routeTo(s) })).sort((a, b) => a.r.distance - b.r.distance)
  return { found: true, fallback, space: spaceOut(ranked[0].s), route: ranked[0].r.points, distance: ranked[0].r.distance,
    alternatives: ranked.slice(1, 4).map(({ s, r }) => ({ ...spaceOut(s), distance: r.distance })) }
}

// ---------- 라우터 ----------
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const AUTH_WRITE_OK = new Set(['/api/auth/login', '/api/auth/test-login', '/api/auth/admin-key-login', '/api/auth/logout'])

function currentUser(token) {
  const id = Number(String(token || '').split('.')[1])
  return db.users.find((u) => u.id === id) || null
}
const need = (user) => { if (!user) throw new MockError(401, '로그인이 필요합니다.'); return user }
const needAdminView = (user) => { need(user); if (!['admin', 'test_admin'].includes(user.role)) throw new MockError(403, '관리자 권한이 필요합니다.'); return user }
const needAdminWrite = (user) => { need(user); if (user.role !== 'admin') throw new MockError(403, '테스트 관리자 계정은 읽기 전용입니다.'); return user }
const find = (list, id, label) => { const item = list.find((x) => x.id === Number(id)); if (!item) throw new MockError(404, `${label}을(를) 찾을 수 없습니다.`); return item }

const routes = [
  ['GET', /^\/api\/health$/, () => ({ status: 'ok', env: 'mock' })],
  ['GET', /^\/api\/auth\/password-policy$/, () => ({ pattern: PASSWORD_RE.source, message: PASSWORD_RULE })],
  ['POST', /^\/api\/auth\/signup$/, (_, b) => {
    if (!PASSWORD_RE.test(b.password || '')) throw new MockError(422, `비밀번호는 ${PASSWORD_RULE}이어야 합니다.`)
    if (db.users.some((u) => u.email === b.email.toLowerCase())) throw new MockError(409, '이미 가입된 이메일입니다.')
    const user = { id: db.users.length + 1, email: b.email.toLowerCase(), password: b.password, name: b.name, role: 'user', provider: 'local', plate: b.plate || null, created_at: now() }
    db.users.push(user)
    return issue(user)
  }],
  ['POST', /^\/api\/auth\/login$/, (_, b) => {
    const user = db.users.find((u) => u.email === String(b.email).toLowerCase() && u.password === b.password)
    if (!user) throw new MockError(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    return issue(user)
  }],
  ['POST', /^\/api\/auth\/test-login$/, (_, b) => issue(db.users.find((u) => u.email === (b.kind === 'user' ? 'user@parkpick.com' : 'testadmin@parkpick.com')))],
  ['POST', /^\/api\/auth\/admin-key-login$/, () => { throw new MockError(503, 'Netlify 데모(Mock)에서는 실제 관리자 키 로그인을 지원하지 않습니다. 테스트 관리자 로그인을 이용해 주세요.') }],
  ['POST', /^\/api\/auth\/logout$/, () => ({ ok: true })],
  ['GET', /^\/api\/auth\/me$/, (u) => publicUser(need(u))],
  ['PATCH', /^\/api\/auth\/me$/, (u, b) => publicUser(Object.assign(need(u), b))],
  ['GET', /^\/api\/auth\/oauth\/providers$/, () => ({ google: false, naver: false, kakao: false })],

  ['GET', /^\/api\/parking\/lot$/, () => ({ id: 1, name: 'parkpick 스마트타워 주차장', address: '서울특별시 강남구 테헤란로 123', floors: FLOORS, entrance: ENTRANCE, map: MAP })],
  ['GET', /^\/api\/parking\/spaces$/, (_, __, p) => db.spaces.filter((s) => !p.get('floor') || s.floor === p.get('floor')).map(spaceOut)],
  ['GET', /^\/api\/parking\/summary$/, () => occupancy()],
  ['GET', /^\/api\/parking\/guidance$/, (_, __, p) => guidance(p)],
  ['GET', /^\/api\/parking\/find-car$/, (u, __, p) => {
    const space = db.spaces.find((s) => s.plate === String(p.get('plate')).replace(/\s/g, ''))
    if (!space) return { found: false, message: '입력한 차량 번호로 인식된 주차 위치가 없습니다.' }
    return { found: true, plate: u?.role === 'test_admin' ? maskPlate(space.plate) : space.plate, space: spaceOut(space), route: routeTo(space).points, parked_since: space.occupied_since }
  }],
  ['GET', /^\/api\/parking\/events\/recent$/, (u) => { need(u); return db.events.filter((e) => e.status === 'open').slice(0, 10).map((e) => eventOut(e)) }],
  ['GET', /^\/api\/parking\/cameras$/, (u) => { need(u); return db.cameras }],

  ['GET', /^\/api\/admin\/users$/, (u) => {
    const masked = needAdminView(u).role === 'test_admin'
    return db.users.map(publicUser).map((x) => (masked ? { ...x, email: maskEmail(x.email), plate: maskPlate(x.plate) } : x))
  }],
  ['PATCH', /^\/api\/admin\/users\/(\d+)\/role$/, (u, b, _, [id]) => {
    const target = find(db.users, id, '사용자')
    if (target.role === 'test_admin') throw new MockError(400, '테스트 관리자 계정의 권한은 변경할 수 없습니다.')
    audit(needAdminWrite(u), 'user.role_change', target.email, { from: target.role, to: b.role })
    target.role = b.role
    return publicUser(target)
  }],
  ['DELETE', /^\/api\/admin\/users\/(\d+)$/, (u, _, __, [id]) => {
    const target = find(db.users, id, '사용자')
    audit(needAdminWrite(u), 'user.delete', target.email)
    db.users = db.users.filter((x) => x !== target)
    return null
  }],
  ['GET', /^\/api\/admin\/dashboard$/, (u) => { needAdminView(u); return dashboard() }],
  ['GET', /^\/api\/admin\/events$/, (u, _, p) => {
    const masked = needAdminView(u).role === 'test_admin'
    return db.events.filter((e) => !p.get('status') || e.status === p.get('status')).map((e) => eventOut(e, masked))
  }],
  ['PATCH', /^\/api\/admin\/events\/(\d+)$/, (u, b, _, [id]) => {
    const event = find(db.events, id, '이벤트')
    audit(needAdminWrite(u), 'event.status', `event#${id}`, { from: event.status, to: b.status })
    event.status = b.status
    return event
  }],
  ['GET', /^\/api\/admin\/cameras$/, (u) => { needAdminView(u); return db.cameras }],
  ['POST', /^\/api\/admin\/cameras$/, (u, b) => { audit(needAdminWrite(u), 'camera.create', b.name); const c = { id: db.cameras.length + 1, roi: [], active: true, ...b }; db.cameras.push(c); return c }],
  ['DELETE', /^\/api\/admin\/cameras\/(\d+)$/, (u, _, __, [id]) => { const c = find(db.cameras, id, '카메라'); audit(needAdminWrite(u), 'camera.delete', c.name); db.cameras = db.cameras.filter((x) => x !== c); return null }],
  ['GET', /^\/api\/admin\/models$/, (u) => { needAdminView(u); return db.models }],
  ['PATCH', /^\/api\/admin\/models\/(\d+)\/activate$/, (u, _, __, [id]) => { const m = find(db.models, id, '모델'); audit(needAdminWrite(u), 'model.activate', m.version); db.models.forEach((x) => (x.active = x === m)); return m }],
  ['GET', /^\/api\/admin\/audit-logs$/, (u) => { const masked = needAdminView(u).role === 'test_admin'; return db.audit.map((a) => (masked ? { ...a, actor: maskEmail(a.actor) } : a)) }],

  ['GET', /^\/api\/reports\/stats$/, (u) => { need(u); return { occupancy: occupancy(), traffic: traffic() } }],
  ['GET', /^\/api\/reports$/, (u) => { need(u); return db.reports }],
  ['POST', /^\/api\/reports\/generate$/, (u, b) => {
    const period = b.period || 'daily'
    const report = { id: db.reports.length + 1, period, title: `${now().slice(0, 10)} ${period === 'daily' ? '일간' : '주간'} 운영 리포트`, content: templateReport(period), source: 'template', created_at: now() }
    audit(needAdminWrite(u), 'report.create', report.title)
    db.reports.unshift(report)
    return report
  }],
  ['DELETE', /^\/api\/reports\/(\d+)$/, (u, _, __, [id]) => { const r = find(db.reports, id, '리포트'); audit(needAdminWrite(u), 'report.delete', r.title); db.reports = db.reports.filter((x) => x !== r); return null }],
]

export async function mockRequest(method, fullPath, body = {}, token) {
  await new Promise((r) => setTimeout(r, 120))
  const url = new URL(fullPath, 'http://mock')
  const user = currentUser(token)
  if (WRITE.has(method) && !AUTH_WRITE_OK.has(url.pathname) && user?.role === 'test_admin')
    throw new MockError(403, '테스트 관리자 계정은 읽기 전용입니다.', 'READ_ONLY')
  for (const [m, re, handler] of routes) {
    const match = m === method && url.pathname.match(re)
    if (match) return structuredClone(handler(user, body || {}, url.searchParams, match.slice(1)))
  }
  throw new MockError(404, '존재하지 않는 API 입니다.')
}

// ---------- 실시간 시뮬레이터 (WebSocket 대체) ----------
const listeners = new Set()
let timer = null
function tick() {
  const pool = db.spaces.filter((s) => s.kind !== 'reserved' && s.code !== 'B1-C05')
  for (let i = 0; i < 2; i++) {
    const s = pool[randInt(0, pool.length - 1)]
    const occupied = s.status === 'empty'
    Object.assign(s, { status: occupied ? 'occupied' : 'empty', plate: occupied ? randomPlate() : null, occupied_since: occupied ? now() : null, updated_at: now() })
    listeners.forEach((cb) => cb({ type: 'space_update', space: spaceOut(s) }))
  }
  if (rand() < 0.08) {
    const s = pool[randInt(0, pool.length - 1)]
    const [kind, severity, message] = [['long_parking', 'medium', '장기 주차 의심 차량 감지'], ['illegal_parking', 'medium', '주차선 침범 / 통로 불법 주차 감지'], ['wrong_way', 'high', '통로 역주행 이동체 감지']][randInt(0, 2)]
    const event = { id: db.events.length + 1, kind, severity, space_code: s.code, plate: randomPlate(), camera: `CCTV-${s.floor}-${s.zone}`, message, status: 'open', created_at: now() }
    db.events.unshift(event)
    listeners.forEach((cb) => cb({ type: 'event', event: eventOut(event) }))
  }
}
export function subscribeMock(cb) {
  listeners.add(cb)
  timer ||= setInterval(tick, 3000)
  return () => {
    listeners.delete(cb)
    if (!listeners.size) { clearInterval(timer); timer = null }
  }
}
