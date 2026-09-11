// src/Setup/index.tsx
// Assistente de primeira inicialização: só aparece quando o sistema ainda não
// tem nenhum super admin. Cria a conta e já entra direto na área /admin.
import { useEffect, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Toast from "../Components/Toast";
import Header from "@/Components/Header";
import { useNavigate } from "react-router";
import { API_URL, saveOwnerSession } from "@/api/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #e8e8e8",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border 0.15s",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  background: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const Setup = () => {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success"; message: string }>({
    show: false,
    type: "error",
    message: "",
  });

  // Se já existe super admin, esse assistente não faz mais sentido — volta pro login.
  useEffect(() => {
    fetch(`${API_URL}/setup/status`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.needsSetup) {
          navigate("/", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToast({ show: true, type: "error", message: "Informe um email válido." });
      return;
    }
    if (password !== confirmPassword) {
      setToast({ show: true, type: "error", message: "As senhas não conferem." });
      return;
    }

    setIsLoading(true);
    setToast({ show: false, type: "error", message: "" });

    try {
      const response = await fetch(`${API_URL}/setup/super-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar super admin");

      setToast({ show: true, type: "success", message: "Super admin criado! Entrando..." });
      saveOwnerSession(data.token, data.user?.role);
      setTimeout(() => navigate("/admin"), 1000);
    } catch (error) {
      setToast({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao criar super admin",
      });
      setIsLoading(false);
    }
  };

  if (checking) return null;

  return (
    <>
      <Header />
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5f5f7",
        padding: "0rem 1rem 0",
      }}>
        <div style={{
          background: "white",
          borderRadius: "10px",
          padding: "32px 28px",
          width: "100%",
          maxWidth: "360px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <Toast
            show={toast.show}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast({ show: false, type: "error", message: "" })}
          />

          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px" }}>
            Configuração inicial
          </h1>
          <p style={{ fontSize: "13px", color: "#999", margin: "0 0 24px" }}>
            Sistema sem super admin — crie o primeiro para continuar
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e8e8e8")}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e8e8e8")}
            />

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha (8+ caracteres, maiúscula, número, símbolo)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ ...inputStyle, padding: "10px 40px 10px 12px" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e8e8e8")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#bbb",
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirme a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e8e8e8")}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{ ...buttonStyle, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
            >
              {isLoading ? "Criando..." : "Criar super admin"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Setup;
