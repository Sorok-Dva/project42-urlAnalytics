import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { HomePage } from '../pages/HomePage'
import { StatisticsPage } from '../pages/StatisticsPage'
import { DeeplinksPage } from '../pages/DeeplinksPage'
import { LinkDetailsPage } from '../pages/LinkDetailsPage'
import { QrCodesPage } from '../pages/QrCodesPage'
import { QrDesignPage } from '../pages/QrDesignPage'
import { WorkspacesPage } from '../pages/WorkspacesPage'
import { AuthPage } from '../pages/AuthPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { useAuth } from '../stores/auth'

const RequireAuth = () => {
  const isAuthenticated = useAuth(state => !!state.token)
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <Outlet />
}

const RequireAdmin = () => {
  const user = useAuth(state => state.user)
  const token = useAuth(state => state.token)
  if (!token) return <Navigate to="/auth" replace />
  if (!user) return null
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="workspaces" element={<WorkspacesPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/stats" element={<StatisticsPage mode="admin" />} />
          </Route>
          <Route path="statistics/:linkId" element={<StatisticsPage />} />
          <Route path="deeplinks" element={<DeeplinksPage />} />
          <Route path="deeplinks/:linkId" element={<LinkDetailsPage />} />
          <Route path="qr-codes" element={<QrCodesPage />} />
          <Route path="qr-codes/:qrId/design" element={<QrDesignPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
