import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/Login'
import Home from '@/Home'
import SignUp from './SignUp'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/home" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes