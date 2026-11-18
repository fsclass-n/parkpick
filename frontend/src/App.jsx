import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Guide from './pages/Guide'
import FindCar from './pages/FindCar'
import MyPage from './pages/MyPage'
import OAuthCallback from './pages/OAuthCallback'
import Policy from './pages/Policy'
import NotFound from './pages/NotFound'
import { useAuth } from './context/AuthContext'

// 차트·관제 화면은 지연 로딩으로 초기 번들 크기 축소
const Monitor = lazy(() => import('./pages/Monitor'))
const Reports = lazy(() => import('./pages/Reports'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const ReportPanel = lazy(() => import('./components/ReportPanel'))

function GuestOnly({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

// 모든 페이지는 공통 Layout(글로벌 헤더/푸터) 안에서 렌더링, 최초 진입은 메인(/)
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="oauth/callback" element={<OAuthCallback />} />
        <Route path="guide" element={<Guide />} />
        <Route path="find-car" element={<FindCar />} />
        <Route path="monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="reports" element={<ReportPanel />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="policy/:kind" element={<Policy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
