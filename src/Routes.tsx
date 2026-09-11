import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from '@/Login'
import SignUp from './SignUp'
import ForgotPassword from './ForgotPassword'
import Setup from './Setup'
import { ProtectedRoute } from './ProtectedRoute'
import { SuperAdminRoute } from './SuperAdminRoute'
import Admin from './Pages/Admin'
import { DashboardLayout } from './DashboardLayout'
import Dashboard from '@/Pages/Dashboard'
import Services from './Pages/Services'
import Settings from './Pages/Configuracoes'
import Calendar from './Pages/Calendar'
import Customers from './Pages/Customers'
import Products from './Pages/Products'
import Caixa from './Pages/Caixa'
import PublicChat from './Pages/PublicChat'
import Agenda from './Pages/Agenda'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/p/:slug" element={<PublicChat />} />
      <Route path="/p/:slug/agenda" element={<Agenda />} />

      {/* Área do super admin (operador da plataforma) — layout próprio, fora do dashboard */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <Admin />
          </SuperAdminRoute>
        }
      />

      {/* Rota protegida */}
      {/* Tudo aqui dentro é protegido E usa o layout com Navbar */}
      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/service" element={<Services />} />
          <Route path="/products" element={<Products />} />
          <Route path="/caixa" element={<Caixa />} />
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