// DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import NavBar from "./Components/DashboardLayout/NavBar";

export function DashboardLayout() {
  return (
    <div className="DashboardLayout">
      <NavBar />
      <main className="mainDashboardLayout">
        <Outlet /> {/* aqui entra Home, Perfil, Configuracao... */}
      </main>
    </div>
  );
}