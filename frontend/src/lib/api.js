import { API_BASE, USE_MOCK } from './config'
import { mockRequest } from '../mock/server'

const TOKEN_KEY = 'parkpick.token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

function detailMessage(data, status) {
  const detail = data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg || '입력값을 확인해 주세요.'
  return detail || (status >= 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' : '요청을 처리하지 못했습니다.')
}

export async function request(path, { method = 'GET', body } = {}) {
  const token = getToken()
  if (USE_MOCK) return mockRequest(method, path, body, token)
  let res
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. (Render 무료 플랜은 첫 요청 시 최대 1분 정도 기동 시간이 걸릴 수 있습니다)')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, detailMessage(data, res.status), data?.code)
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  put: (path, body = {}) => request(path, { method: 'PUT', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}

export const oauthLoginUrl = (provider) => `${API_BASE}/api/auth/oauth/${provider}/login`
