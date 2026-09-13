// SuperAdminRoute.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_URL, getOwnerRole, clearOwnerSession } from "@/api/client";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "forbidden">("loading");

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
      .then((res) => {
        if (!res.ok) throw new Error();
        // Guarda rápida no front — o acesso de verdade é reconferido no
        // backend a cada chamada de /admin/*.
        setStatus(getOwnerRole() === "super_admin" ? "valid" : "forbidden");
      })
      .catch(() => {
        clearOwnerSession();
        setStatus("invalid");
      });
  }, []);

  if (status === "loading") return <p>Carregando...</p>;
  if (status === "invalid") return <Navigate to="/" replace />;
  if (status === "forbidden") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
