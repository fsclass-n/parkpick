import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/ui'

// 백엔드 OAuth 콜백 → /oauth/callback#token=... 으로 리다이렉트된 토큰을 세션으로 저장
export default function OAuthCallback() {
  const { loginWithToken } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }
    loginWithToken(token)
      .then((user) => { toast(`${user.name}님, 환영합니다.`, 'success'); navigate('/', { replace: true }) })
      .catch(() => navigate('/login?error=oauth_failed', { replace: true }))
  }, [loginWithToken, navigate, toast])
  return <Spinner label="소셜 로그인 처리 중..." />
}
