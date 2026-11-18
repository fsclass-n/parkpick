export const pct = (v, digits = 1) => `${((v || 0) * 100).toFixed(digits)}%`

export function toDate(value) {
  if (!value) return null
  // 백엔드는 UTC naive ISO 문자열을 반환 → 'Z' 를 붙여 UTC 로 해석
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
}

export function formatDateTime(value) {
  const d = toDate(value)
  return d ? d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
}

export function elapsed(value) {
  const d = toDate(value)
  if (!d) return '-'
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000))
  return min < 60 ? `${min}분` : `${Math.floor(min / 60)}시간 ${min % 60}분`
}
