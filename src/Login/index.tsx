import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Toast from "../Components/Toast";
import Header from "@/Components/Header";
import { Link } from "react-router";
import { useNavigate } from "react-router";

const Login = () => {
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success"; message: string }>({
    show: false,
    type: "error",
    message: ""
  });

  // Formata CPF ou CNPJ
  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 11) {
      // CPF
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    // CNPJ
    return numbers
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    const numbers = document.replace(/\D/g, "");
    if (numbers.length < 11 || numbers.length > 14) {
      setToast({ show: true, type: "error", message: "CPF ou CNPJ inválido." });
      return;
    }

    if (!password.trim()) {
      setToast({ show: true, type: "error", message: "Preencha todos os campos." });
      return;
    }

    setIsLoading(true);
    setToast({ show: false, type: "error", message: "" });

    try {
      const response = await fetch("http://localhost:3000/authentication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: numbers, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao fazer login");
      }

      setToast({ show: true, type: "success", message: "Login realizado!" });

      localStorage.setItem("token", data.token)
      setTimeout(() => {
        console.log("Redirecionando...");
        navigate("/dashboard");
        setIsLoading(false);
      }, 1500);


    } catch (error) {
      setToast({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao fazer login",
      });
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

          <h1 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#1a1a1a",
            margin: "0 0 4px",
          }}>Entrar</h1>

          <p style={{
            fontSize: "13px",
            color: "#999",
            margin: "0 0 24px",
          }}>Bem-vindo de volta</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              type="text"
              placeholder="CPF ou CNPJ"
              value={document}
              onChange={(e) => setDocument(formatDocument(e.target.value))}
              maxLength={18}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #e8e8e8",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.15s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
            />

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e8e8e8",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border 0.15s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
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

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "10px",
                background: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "14px",
            fontSize: "12px",
          }}>

            <span style={{ color: "#999" }}>
              Não tem conta?{" "}
              <Link to="signup" style={{
                background: "none",
                border: "none",
                color: "#1a1a1a",
                fontWeight: "500",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}>
                Cadastre-se
              </Link>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;