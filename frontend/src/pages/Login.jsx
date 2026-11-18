import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, oauthLoginUrl } from '../lib/api'
import { PASSWORD_RE, USE_MOCK } from '../lib/config'
import Logo from '../components/Logo'

const TEST_ACCOUNTS = {
  user: { email: 'user@parkpick.com', password: 'User1234!', label: '일반 사용자', icon: 'fa-user' },
  test_admin: { email: 'testadmin@parkpick.com', password: 'Admin1234!', label: '테스트 관리자', icon: 'fa-user-shield' },
}

const SOCIAL = [
  { id: 'google', label: 'Google', className: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', icon: 'fa-brands fa-google text-[#4285F4]' },
  { id: 'naver', label: '네이버', className: 'bg-[#03C75A] text-white hover:brightness-95', icon: 'fa-solid fa-n font-black' },
  { id: 'kakao', label: '카카오', className: 'bg-[#FEE500] text-[#191919] hover:brightness-95', icon: 'fa-solid fa-comment' },
]

const RULES = [
  [/[a-z]/, '영문 소문자'],
  [/[A-Z]/, '영문 대문자'],
  [/\d/, '숫자'],
  [/[^A-Za-z0-9]/, '특수문자'],
  [/^.{8,}$/, '8자리 이상'],
]

function PasswordRules({ value }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
      {RULES.map(([re, label]) => {
        const ok = re.test(value)
        return (
          <li key={label} className={ok ? 'text-emerald-600' : 'text-slate-400'}>
            <i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle'} mr-1 text-[10px]`} />{label}
          </li>
        )
      })}
    </ul>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative"><Logo light /></div>
      <div className="relative">
        {/* 브랜드 그래픽: 주차면 그리드 + 탐지 박스 */}
        <div className="mb-10 grid max-w-md grid-cols-6 gap-2">
          {Array.from({ length: 18 }, (_, i) => {
            const occupied = [1, 2, 4, 7, 8, 9, 12, 14, 15, 17].includes(i)
            return (
              <div key={i} className={`relative aspect-[3/5] rounded-md border-2 ${occupied ? 'border-red-400/80 bg-red-400/25' : 'border-emerald-300/80 bg-emerald-300/10'}`}>
                {occupied && <span className="absolute inset-1.5 rounded border border-dashed border-lime-300" />}
                {i === 5 && <i className="fa-solid fa-location-dot absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce text-brand-200" />}
              </div>
            )
          })}
        </div>
        <h2 className="font-heading text-[34px] font-bold leading-tight !text-white">AI가 찾아주는<br />가장 가까운 빈 자리</h2>
        <p className="mt-4 max-w-md text-slate-200">CCTV 이동체 영상 분석으로 주차면 점유를 실시간 판별하고, 운전자에게는 유도 경로를, 운영자에게는 관제 대시보드를 제공합니다.</p>
        <ul className="mt-8 space-y-3 text-sm text-slate-200">
          {['YOLO 객체 탐지 · ByteTrack 이동체 추적', '번호판 OCR 기반 내 차 찾기', 'WebSocket 실시간 관제 · Gemini 운영 리포트'].map((t) => (
            <li key={t}><i className="fa-solid fa-check mr-2 text-emerald-300" />{t}</li>
          ))}
        </ul>
      </div>
      <p className="relative text-[13px] text-slate-400">© 2026 parkpick · AI 주차관제 및 유도 시스템</p>
    </div>
  )
}

export default function Login() {
  const { login, signup, adminKeyLogin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', plate: '' })
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminKey, setAdminKey] = useState('')

  useEffect(() => {
    const err = params.get('error')
    if (err === 'oauth_not_configured') toast(`${params.get('provider')} 소셜 로그인이 서버에 아직 설정되지 않았습니다.`, 'warn')
    else if (err) toast('소셜 로그인에 실패했습니다. 다시 시도해 주세요.', 'error')
  }, [params, toast])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const pwValid = PASSWORD_RE.test(form.password)
  const done = (user) => {
    toast(`${user.name}님, 환영합니다.`, 'success')
    navigate(next, { replace: true })
  }
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      done(await fn())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!pwValid) return setError('비밀번호는 영문 대·소문자, 숫자, 특수문자를 조합해 8자리 이상이어야 합니다.')
    run(() => (mode === 'login' ? login(form.email, form.password) : signup({ ...form, plate: form.plate || null })))
  }

  // 테스트 계정 간편 로그인: 폼 자동 입력 후 즉시 로그인
  const quickLogin = (kind) => {
    const acc = TEST_ACCOUNTS[kind]
    setMode('login')
    setForm((f) => ({ ...f, email: acc.email, password: acc.password }))
    run(() => login(acc.email, acc.password))
  }

  const social = async (provider) => {
    if (USE_MOCK) return toast('Netlify 데모에서는 소셜 로그인을 지원하지 않습니다. 테스트 계정을 이용해 주세요.', 'warn')
    try {
      const providers = await api.get('/api/auth/oauth/providers')
      if (!providers[provider]) return toast('해당 소셜 로그인은 서버 환경 변수(CLIENT_ID/SECRET) 설정 후 사용할 수 있습니다.', 'warn')
      window.location.href = oauthLoginUrl(provider)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center px-4 py-12 md:px-10">
        <div className="w-full max-w-md">
          <h1 className="pp-h1">{mode === 'login' ? '로그인' : '회원가입'}</h1>
          <p className="mt-2 text-slate-500">{mode === 'login' ? 'parkpick 관제 플랫폼에 오신 것을 환영합니다.' : '이메일로 parkpick 계정을 만드세요.'}</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {Object.entries(TEST_ACCOUNTS).map(([kind, acc]) => (
              <button key={kind} type="button" disabled={busy} onClick={() => quickLogin(kind)}
                className={`btn ${kind === 'user' ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
                <i className={`fa-solid ${acc.icon}`} /> {acc.label}
              </button>
            ))}
          </div>
          <p className="pp-caption mt-2 text-center">테스트 계정 버튼을 누르면 자동 입력 후 로그인됩니다. (테스트 관리자는 읽기 전용)</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="name">이름</label>
                <input id="name" className="input" value={form.name} onChange={set('name')} required placeholder="홍길동" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">이메일</label>
              <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={set('email')} required placeholder="name@company.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">비밀번호</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`input pr-12 ${form.password && !pwValid ? '!border-red-400' : ''}`} value={form.password} onChange={set('password')} required placeholder="영문 대·소문자, 숫자, 특수문자 8자 이상" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPw(!showPw)} aria-label="비밀번호 표시 전환">
                  <i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              <PasswordRules value={form.password} />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="plate">차량 번호 (선택)</label>
                <input id="plate" className="input" value={form.plate} onChange={set('plate')} placeholder="12가3456" />
              </div>
            )}
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><i className="fa-solid fa-circle-exclamation mr-1" />{error}</p>}
            <button className="btn-primary w-full !py-3" disabled={busy}>
              {busy ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-right-to-bracket" />}
              {mode === 'login' ? '로그인' : '가입하고 시작하기'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-3 text-[13px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />소셜 계정으로 계속하기<span className="h-px flex-1 bg-slate-200" /></div>
          <div className="grid grid-cols-3 gap-3">
            {SOCIAL.map((s) => (
              <button key={s.id} type="button" onClick={() => social(s.id)} className={`btn ${s.className}`}>
                <i className={s.icon} /> <span className="text-[13px]">{s.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            {mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
            <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-600" onClick={() => setAdminOpen(!adminOpen)}>
              <span><i className="fa-solid fa-key mr-2 text-slate-400" />관리자 보안 키로 로그인</span>
              <i className={`fa-solid fa-chevron-down text-xs transition ${adminOpen ? 'rotate-180' : ''}`} />
            </button>
            {adminOpen && (
              <form className="flex gap-2 border-t border-slate-100 p-4" onSubmit={(e) => { e.preventDefault(); run(() => adminKeyLogin(adminKey)) }}>
                <input type="password" className="input" placeholder="ADMIN_SECRET_KEY" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} autoComplete="off" />
                <button className="btn bg-slate-900 text-white hover:bg-slate-800" disabled={busy || !adminKey}>확인</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
