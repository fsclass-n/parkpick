import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-pp flex flex-col items-center py-28 text-center">
      <p className="font-heading text-[80px] font-bold text-brand-600">404</p>
      <h1 className="pp-h2">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-slate-500">주소가 변경되었거나 존재하지 않는 페이지입니다.</p>
      <Link to="/" className="btn-primary mt-8"><i className="fa-solid fa-house" /> 메인으로 이동</Link>
    </div>
  )
}
