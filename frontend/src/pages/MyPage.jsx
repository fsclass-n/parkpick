import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ROLE_LABEL } from '../lib/config'
import { formatDateTime } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageHeader } from '../components/ui'

const PROVIDER = { local: '이메일', google: 'Google', naver: '네이버', kakao: '카카오' }

export default function MyPage() {
  const { user, isTestAdmin, guardWrite, refresh } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, plate: user.plate || '' })

  const save = guardWrite(async (e) => {
    e?.preventDefault?.()
    await api.patch('/api/auth/me', { name: form.name, plate: form.plate.replace(/\s/g, '') || null })
    await refresh()
    toast('프로필을 저장했습니다.', 'success')
  })

  return (
    <div className="container-pp py-10">
      <PageHeader icon="fa-user" title="마이페이지" desc="계정 정보와 등록 차량을 관리합니다." />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="card lg:col-span-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">{user.name.slice(0, 1)}</span>
            <div className="min-w-0">
              <p className="pp-h3">{user.name}</p>
              <p className="pp-caption truncate">{user.email}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {[
              ['권한', ROLE_LABEL[user.role]],
              ['가입 방식', PROVIDER[user.provider] || user.provider],
              ['가입일', formatDateTime(user.created_at)],
              ['최근 로그인', formatDateTime(user.last_login_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
        <form className="card lg:col-span-8" onSubmit={save}>
          <h2 className="pp-h3">프로필 수정</h2>
          {isTestAdmin && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><i className="fa-solid fa-lock mr-1" />테스트 관리자 계정은 읽기 전용이라 수정할 수 없습니다.</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">이름</label>
              <input id="name" className="input" value={form.name} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="plate">등록 차량 번호</label>
              <input id="plate" className="input" placeholder="12가3456" value={form.plate} disabled={isTestAdmin} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className={isTestAdmin ? 'btn-outline opacity-60' : 'btn-primary'} type="submit">
              <i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-floppy-disk'}`} /> 저장
            </button>
            {user.plate && <Link to="/find-car" className="btn-outline"><i className="fa-solid fa-magnifying-glass-location" /> 내 차 위치 보기</Link>}
          </div>
        </form>
      </div>
    </div>
  )
}
