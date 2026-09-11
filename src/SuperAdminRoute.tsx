// SuperAdminRoute.tsx
// Igual ao ProtectedRoute, mas só deixa passar quem tem role "super_admin".
// A checagem final é do backend (todas as rotas /admin conferem o banco); aqui
// é só o gate de navegação — usa o /validate-token, que devolve o role do JWT.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_URL } from "@/api/client";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "not-admin" | "invalid">("loading");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("invalid");
      return;
    }

    fetch(`${API_URL}/validate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.role === "super_admin") {
          localStorage.setItem("role", "super_admin");
          setStatus("ok");
        } else {
          setStatus("not-admin");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setStatus("invalid");
      });
  }, []);

  if (status === "loading") return <p style={{ padding: 24 }}>Carregando...</p>;
  if (status === "invalid") return <Navigate to="/" replace />;
  if (status === "not-admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
