// Netlify 데모: VITE_USE_MOCK=true → 백엔드 없이 브라우저 Mock 데이터로 동작
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'false') === 'true'
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws/parking'

export const LINKS = {
  github: 'https://github.com/fsclass-n/parkpick',
  pages: 'https://fsclass-n.github.io/parkpick/',
  demo: 'https://parkpick.netlify.app',
  api: 'https://parkpick-api.onrender.com/docs',
}

export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
export const PASSWORD_RULE = '영문 대·소문자, 숫자, 특수문자를 모두 포함해 8자리 이상'

export const STATUS = {
  empty: { label: '빈 자리', color: 'var(--color-st-empty)' },
  occupied: { label: '점유', color: 'var(--color-st-occupied)' },
  disabled: { label: '장애인 전용', color: 'var(--color-st-disabled)' },
  ev: { label: '전기차 충전', color: 'var(--color-st-ev)' },
  reserved: { label: '예약/임시', color: 'var(--color-st-reserved)' },
  alert: { label: '이상 이벤트', color: 'var(--color-st-alert)' },
}

export const EVENT_LABEL = { long_parking: '장기 주차', illegal_parking: '불법 주차', wrong_way: '역주행' }
export const ROLE_LABEL = { user: '일반 사용자', admin: '관리자', test_admin: '테스트 관리자' }
