/**
 * ClientAuthGate — "portão" de login/cadastro do CLIENTE FINAL.
 *
 * Envolve as páginas públicas (/p/:slug e /p/:slug/agendar): se o cliente já
 * está logado, renderiza o conteúdo; senão mostra um cadastro bem rápido
 * (nome, CPF, celular, senha + aceite LGPD) ou login (CPF/celular + senha).
 */
import { useState, type ReactNode } from "react";
import { FiUser, FiPhone, FiLock, FiCreditCard, FiLogIn, FiUserPlus, FiMail } from "react-icons/fi";
import {
  API_URL,
  getClientToken,
  getClientSession,
  saveClientSession,
  clearClientSession,
  type ClientSession,
} from "@/api/client";
import { formatPhone, formatCPF, validateCPF } from "../../SignUp/passwordValidation";
import "./index.css";

interface ClientAuthGateProps {
  businessName?: string;
  children: ReactNode;
}

type Mode = "login" | "register";

const ClientAuthGate = ({ businessName, children }: ClientAuthGateProps) => {
  const [session, setSession] = useState<ClientSession | null>(() =>
    getClientToken() ? getClientSession() : null
  );
  const [mode, setMode] = useState<Mode>("register");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cadastro
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  // Login
  const [login, setLogin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  if (session) return <>{children}</>;

  const submit = async (path: string, body: object) => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Erro na requisição");
      }
      saveClientSession(data.token, data.client);
      setSession(data.client);
    } catch (err) {
      clearClientSession();
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = () => {
    const cpfCheck = validateCPF(cpf);
    if (!cpfCheck.valid) {
      setError(cpfCheck.message);
      return;
    }
    submit("/client/register", { name, cpf, phone, email: email.trim() || undefined, password, lgpdAccepted });
  };

  const handleLogin = () => {
    submit("/client/login", { login, password: loginPassword });
  };

  const registerValid =
    name.trim().length > 1 && cpf.replace(/\D/g, "").length === 11 &&
    phone.replace(/\D/g, "").length >= 10 && password.length >= 6 && lgpdAccepted;

  const loginValid = login.replace(/\D/g, "").length >= 10 && loginPassword.length > 0;

  return (
    <div className="cgate-page">
      <div className="cgate-card">
        <h2>{mode === "register" ? "Criar sua conta" : "Entrar"}</h2>
        <p className="cgate-sub">
          {businessName
            ? `Para agendar ou conversar com ${businessName}, ${mode === "register" ? "crie sua conta em segundos" : "entre na sua conta"}.`
            : mode === "register" ? "Crie sua conta em segundos." : "Entre na sua conta."}
        </p>

        <div className="cgate-tabs">
          <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>
            <FiUserPlus size={13} /> Criar conta
          </button>
          <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>
            <FiLogIn size={13} /> Já tenho conta
          </button>
        </div>

        {error && <div className="cgate-error">{error}</div>}

        {mode === "register" ? (
          <div className="cgate-form">
            <div className="cgate-field">
              <label><FiUser size={13} /> Nome completo</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
            </div>
            <div className="cgate-field">
              <label><FiCreditCard size={13} /> CPF</label>
              <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className="cgate-field">
              <label><FiPhone size={13} /> Celular</label>
              <input inputMode="numeric" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </div>
            <div className="cgate-field">
              <label><FiMail size={13} /> Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Para receber confirmação e lembrete dos agendamentos"
              />
            </div>
            <div className="cgate-field">
              <label><FiLock size={13} /> Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <label className="cgate-lgpd">
              <input type="checkbox" checked={lgpdAccepted} onChange={(e) => setLgpdAccepted(e.target.checked)} />
              <span>
                Autorizo o uso dos meus dados (nome, CPF, celular e email) exclusivamente para
                agendamento e contato sobre meus atendimentos, conforme a{" "}
                <strong>Lei Geral de Proteção de Dados (LGPD)</strong>. Posso pedir a
                exclusão dos meus dados a qualquer momento.
              </span>
            </label>

            <button className="cgate-btn" disabled={!registerValid || submitting} onClick={handleRegister}>
              {submitting ? "Criando conta..." : "Criar conta e continuar"}
            </button>
          </div>
        ) : (
          <div className="cgate-form">
            <div className="cgate-field">
              <label><FiCreditCard size={13} /> CPF ou celular</label>
              <input
                inputMode="numeric"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="CPF ou celular"
                autoFocus
              />
            </div>
            <div className="cgate-field">
              <label><FiLock size={13} /> Senha</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Sua senha"
                onKeyDown={(e) => { if (e.key === "Enter" && loginValid) handleLogin(); }}
              />
            </div>
            <button className="cgate-btn" disabled={!loginValid || submitting} onClick={handleLogin}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAuthGate;
