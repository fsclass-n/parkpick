import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

// 비로그인 → /login?next=원래경로, 관리자 전용 페이지는 admin/test_admin 만 접근
export default function ProtectedRoute({ children, admin = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="세션 확인 중..." />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}
