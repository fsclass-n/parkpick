import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)
export const READ_ONLY_MESSAGE = '테스트 관리자 계정은 읽기 전용입니다'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const toast = useToast()

  useEffect(() => {
    if (!getToken()) return
    api.get('/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const applySession = useCallback((data) => {
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => {
    const role = user?.role
    return {
      user,
      loading,
      isAdmin: role === 'admin' || role === 'test_admin',
      isTestAdmin: role === 'test_admin',
      canWrite: role === 'admin',
      login: (email, password) => api.post('/api/auth/login', { email, password }).then(applySession),
      signup: (body) => api.post('/api/auth/signup', body).then(applySession),
      testLogin: (kind) => api.post('/api/auth/test-login', { kind }).then(applySession),
      adminKeyLogin: (adminKey) => api.post('/api/auth/admin-key-login', { admin_key: adminKey }).then(applySession),
      loginWithToken: async (token) => {
        setToken(token)
        const me = await api.get('/api/auth/me')
        setUser(me)
        return me
      },
      refresh: () => api.get('/api/auth/me').then(setUser),
      logout: () => {
        api.post('/api/auth/logout').catch(() => {})
        setToken(null)
        setUser(null)
      },
      // 관리자 쓰기 동작 공통 가드: 테스트 관리자는 요청 전에 차단하고 안내 토스트 표시
      guardWrite: (action) => async (...args) => {
        if (role === 'test_admin') return toast(READ_ONLY_MESSAGE, 'warn')
        try {
          return await action(...args)
        } catch (err) {
          toast(err.code === 'READ_ONLY' ? READ_ONLY_MESSAGE : err.message, err.code === 'READ_ONLY' ? 'warn' : 'error')
        }
      },
    }
  }, [user, loading, applySession, toast])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
