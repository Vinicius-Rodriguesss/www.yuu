import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from '@/Login'
import SignUp from './SignUp'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from './DashboardLayout'
import Dashboard from '@/Pages/Dashboard'
import Services from './Pages/Services'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Rota protegida */}
      {/* Tudo aqui dentro é protegido E usa o layout com Navbar */}
      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/service" element={<Services />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes