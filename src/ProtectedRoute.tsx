// ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
   // Depois de um tempo preciso apagar o token do LocalStorage
    const token = localStorage.getItem("token");

    if (!token) {
      setStatus("invalid");
      return;
    }

    fetch("http://localhost:3000/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setStatus("valid");
      })
      .catch(() => {
        localStorage.removeItem("token");
        setStatus("invalid");
      });
  }, []);

  if (status === "loading") return <p>Carregando...</p>;
  if (status === "invalid") return <Navigate to="/" replace />;

  return <>{children}</>;
}