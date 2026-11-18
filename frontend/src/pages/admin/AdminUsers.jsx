import { useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { ROLE_LABEL } from '../../lib/config'
import { formatDateTime } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ErrorBox, Spinner } from '../../components/ui'

const ROLE_BADGE = { user: 'bg-slate-100 text-slate-700', admin: 'bg-brand-100 text-brand-700', test_admin: 'bg-amber-100 text-amber-800' }

export default function AdminUsers() {
  const { user: me, isTestAdmin, guardWrite } = useAuth()
  const toast = useToast()
  const { data, error, loading, reload, setData } = useApi('/api/admin/users')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => (data || []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [data, q])

  const changeRole = guardWrite(async (target) => {
    const role = target.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`${target.name} 님의 권한을 '${ROLE_LABEL[role]}'(으)로 변경할까요?`)) return
    const updated = await api.patch(`/api/admin/users/${target.id}/role`, { role })
    setData((list) => list.map((u) => (u.id === updated.id ? updated : u)))
    toast('권한을 변경했습니다.', 'success')
  })
  const remove = guardWrite(async (target) => {
    if (!confirm(`${target.name} 님을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    await api.del(`/api/admin/users/${target.id}`)
    setData((list) => list.filter((u) => u.id !== target.id))
    toast('회원을 삭제했습니다.', 'success')
  })

  if (error) return <ErrorBox message={error.message} onRetry={reload} />
  return (
    <section className="card !p-0">
      <div className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="pp-h3">회원 목록</h2>
          <p className="pp-caption mt-1">총 {data?.length ?? 0}명 · 권한 변경(일반 사용자 ↔ 관리자) 및 삭제는 감사 로그에 기록됩니다.</p>
        </div>
        <div className="relative md:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-10" placeholder="이름·이메일 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {loading && !data ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="table-pp min-w-[760px]">
            <thead><tr><th>이름</th><th>이메일</th><th>가입 방식</th><th>권한</th><th>최근 로그인</th><th className="text-right">관리</th></tr></thead>
            <tbody>
              {filtered.map((u) => {
                const locked = u.role === 'test_admin' || u.id === me.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="font-medium">{u.name}{u.id === me.id && <span className="pp-caption ml-1">(나)</span>}</td>
                    <td className="text-slate-500">{u.email}</td>
                    <td>{u.provider}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                    <td className="text-slate-500">{formatDateTime(u.last_login_at)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-outline !px-3 !py-1.5 text-[13px]" disabled={locked && !isTestAdmin} onClick={() => changeRole(u)}>
                          <i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-user-gear'}`} /> {u.role === 'admin' ? '일반 사용자로' : '관리자로'}
                        </button>
                        <button className="btn-ghost !px-3 !py-1.5 text-[13px] !text-red-600" disabled={locked && !isTestAdmin} onClick={() => remove(u)} aria-label="삭제">
                          <i className={`fa-solid ${isTestAdmin ? 'fa-lock' : 'fa-trash'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
