import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Toast from "../Components/Toast";
import Header from "@/Components/Header";
import { Link, useNavigate } from "react-router";
import { API_URL } from "@/api/client";

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

const ForgotPassword = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success"; message: string }>({
    show: false,
    type: "error",
    message: "",
  });

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToast({ show: true, type: "error", message: "Informe um email válido." });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao solicitar código");

      setToast({ show: true, type: "success", message: data.message });
      setStep(2);
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao solicitar código" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setToast({ show: true, type: "error", message: "Informe o código de 6 dígitos." });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ show: true, type: "error", message: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ show: true, type: "error", message: "As senhas não conferem." });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao redefinir senha");

      setToast({ show: true, type: "success", message: "Senha redefinida! Faça login com a nova senha." });
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao redefinir senha" });
    } finally {
      setIsLoading(false);
    }
  };

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
            Esqueci minha senha
          </h1>

          {step === 1 ? (
            <>
              <p style={{ fontSize: "13px", color: "#999", margin: "0 0 24px" }}>
                Informe seu email para receber um código de redefinição
              </p>

              <form onSubmit={handleRequestCode} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
                <button type="submit" disabled={isLoading} style={{ ...buttonStyle, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}>
                  {isLoading ? "Enviando..." : "Enviar código"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: "#999", margin: "0 0 24px" }}>
                Digite o código recebido e sua nova senha
              </p>

              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  style={{ ...inputStyle, fontSize: "20px", letterSpacing: "6px", textAlign: "center" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ ...inputStyle, padding: "10px 40px 10px 12px" }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#bbb" }}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />

                <button type="submit" disabled={isLoading} style={{ ...buttonStyle, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}>
                  {isLoading ? "Redefinindo..." : "Redefinir senha"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: "none", border: "none", color: "#999", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Voltar
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: "14px", fontSize: "12px", textAlign: "center" }}>
            <Link to="/" style={{ color: "#1a1a1a", fontWeight: "500", textDecoration: "underline" }}>
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
