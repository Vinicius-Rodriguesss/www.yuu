import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from '@/Login'
import SignUp from './SignUp'
import ForgotPassword from './ForgotPassword'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from './DashboardLayout'
import Dashboard from '@/Pages/Dashboard'
import Services from './Pages/Services'
import Settings from './Pages/Configuracoes'
import Calendar from './Pages/Calendar'
import Customers from './Pages/Customers'
import PublicChat from './Pages/PublicChat'
import PublicBooking from './Pages/PublicBooking'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/p/:slug" element={<PublicChat />} />
      <Route path="/p/:slug/agendar" element={<PublicBooking />} />

      {/* Rota protegida */}
      {/* Tudo aqui dentro é protegido E usa o layout com Navbar */}
      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/service" element={<Services />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/config" element={<Settings />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calender" element={<Navigate to="/calendar" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes