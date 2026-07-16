import { useEffect, useState, type CSSProperties } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { validatePassword, isAllValid, isPasswordMatch, passwordRequirements, validateFullName, validateCPF, isAddressValid, formatCEP, type ViaCEPResponse } from "./passwordValidation";
import Toast from "../Components/Toast";
import Header from "@/Components/Header";
import { Link } from "react-router";

const SignUp = () => {
  const [step, setStep] = useState(1);
  const [typePassword, setTypePassWord] = useState('password')

  const [password, setPassWord] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [skipCepAutoFill, setSkipCepAutoFill] = useState(false);

  const [accountType, setAccountType] = useState<"establishment" | "professional" | "">("");
  const [homeService, setHomeService] = useState(false);

  const [businessType, setBusinessType] = useState("");

  const [aiStyle, setAiStyle] = useState<"direto" | "amigavel" | "profissional" | "">("");
  const [customAiStyle, setCustomAiStyle] = useState("");

  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success" | "warning" | "info"; message: string }>({ show: false, type: "error", message: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = validatePassword(password);
  const allValid = isAllValid(checks);
  const nameValidation = validateFullName(name);

  const getProgress = () => {
    const totalSteps = 7;
    return Math.round((step / totalSteps) * 100);
  };

  const getMotivationalMessage = () => {
    const messages: Record<number, string> = {
      1: "Preencha seus dados para começar.",
      2: "Informe seu endereço.",
      3: "Escolha o tipo de conta.",
      4: "Selecione seu segmento.",
      5: "Defina o estilo de atendimento da IA.",
      6: "Configure sua jornada de trabalho.",
      7: "Revise seus dados e finalize."
    };
    return messages[step] || "Continue!";
  };

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handlePrev = () => {
    if (step === 1) return;
    setStep(step - 1);
  };

  const handleNext = () => {
    setToast({ show: false, type: "error", message: "" });

    if (step === 1) {
      if (!nameValidation.valid) {
        setToast({ show: true, type: "error", message: nameValidation.message });
        return;
      }
      if (!cpfCnpjStatus || cpfCnpjStatus.type !== "success") {
        setToast({ show: true, type: "error", message: "CPF/CNPJ inválido. Verifique e tente novamente." });
        return;
      }
      if (!allValid) {
        setToast({ show: true, type: "error", message: "A senha não atende aos requisitos mínimos." });
        return;
      }
      if (!isPasswordMatch(password, confirmPassword)) {
        setToast({ show: true, type: "error", message: "As senhas não conferem." });
        return;
      }
    }

    if (step === 2) {
      if (!isAddressValid(cep, street, addressNumber, neighborhood, city, state)) {
        setToast({ show: true, type: "error", message: "Preencha todos os campos obrigatórios do endereço." });
        return;
      }
    }

    if (step === 3) {
      if (!accountType) {
        setToast({ show: true, type: "warning", message: "Selecione um tipo de conta." });
        return;
      }
    }

    if (step === 4) {
      if (!businessType) {
        setToast({ show: true, type: "warning", message: "Selecione seu tipo de negócio." });
        return;
      }
    }

    if (step === 5) {
      if (!aiStyle) {
        setToast({ show: true, type: "warning", message: "Selecione um estilo de atendimento." });
        return;
      }
      if (aiStyle === "profissional" && !customAiStyle.trim()) {
        setToast({ show: true, type: "warning", message: "Descreva como você atende seus clientes." });
        return;
      }
    }

    if (step === 6) {
      if (!workStart || !workEnd) {
        setToast({ show: true, type: "warning", message: "Defina o horário de início e fim do expediente." });
        return;
      }
      if (workStart >= workEnd) {
        setToast({ show: true, type: "error", message: "O horário de início deve ser antes do horário de término." });
        return;
      }
      if (workDays.length === 0) {
        setToast({ show: true, type: "warning", message: "Selecione pelo menos um dia da semana." });
        return;
      }
    }

    if (step === 7) {
      if (!privacyAccepted) {
        setToast({ show: true, type: "warning", message: "Você precisa aceitar a Política de Privacidade." });
        return;
      }
      handleSubmit();
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setToast({ show: false, type: "error", message: "" });

    const cleanDocument = cpfCnpj.replace(/\D/g, "");

    const formData = {
      name,
      document: cleanDocument,
      password,
      address: {
        cep,
        street,
        number: addressNumber,
        complement: complement || undefined,
        neighborhood,
        city,
        state,
      },
      accountType,
      homeService,
      businessType,
      aiStyle,
      customAiStyle: customAiStyle || undefined,
      workSchedule: {
        startTime: workStart,
        endTime: workEnd,
        daysOfWeek: workDays,
      },
      privacyAccepted,
    };

    try {
      const response = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao realizar cadastro");
      }

      setToast({
        show: true,
        type: "success",
        message: "Cadastro realizado com sucesso! Bem-vindo à YuU.",
      });

      setTimeout(() => {
        console.log("Redirecionando para dashboard...");
        window.location.href = "/login";
        setIsSubmitting(false);
      }, 1000);

    } catch (error) {
      setToast({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao realizar cadastro",
      });
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setTypePassWord((prev) => (prev === "password" ? "text" : "password"));
  };

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return numbers
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  useEffect(() => {
    const numbers = cpfCnpj.replace(/\D/g, "");
    if (!numbers) {
      setCpfCnpjStatus(null);
      return;
    }
    if (numbers.length === 11) {
      const result = validateCPF(numbers);
      setCpfCnpjStatus({
        type: result.valid ? "success" : "error",
        message: result.message,
      });
      return;
    }
    if (numbers.length === 14) {
      setCpfCnpjStatus({ type: "loading", message: "Consultando CNPJ..." });
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numbers}`);
          if (!response.ok) {
            setCpfCnpjStatus({ type: "error", message: "CNPJ não encontrado." });
            return;
          }
          const data = await response.json();
          setCpfCnpjStatus({
            type: "success",
            message: `CNPJ válido: ${data.razao_social || data.nome_fantasia || "Empresa encontrada"}`,
          });
        } catch {
          setCpfCnpjStatus({ type: "error", message: "Erro ao consultar CNPJ." });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (numbers.length > 0 && numbers.length < 11) {
      setCpfCnpjStatus({ type: "error", message: "Documento incompleto." });
      return;
    }
    if (numbers.length > 11 && numbers.length < 14) {
      setCpfCnpjStatus({ type: "error", message: "Documento incompleto." });
      return;
    }
    setCpfCnpjStatus(null);
  }, [cpfCnpj]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setCepStatus({ type: "error", message: "Geolocalização não suportada pelo navegador." });
      return;
    }
    setLocationLoading(true);
    setCepStatus({ type: "loading", message: "Obtendo localização..." });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR`
          );
          if (!response.ok) {
            setCepStatus({ type: "error", message: "Erro ao buscar endereço pela localização." });
            return;
          }
          const data = await response.json();
          const addr = data.address || {};
          const rawCep = (addr.postcode || "").replace(/\D/g, "");
          setCep(rawCep.length === 8 ? formatCEP(rawCep) : addr.postcode || "");
          setStreet(addr.road || addr.street || "");
          setNeighborhood(addr.suburb || addr.neighbourhood || addr.district || "");
          setCity(addr.city || addr.town || addr.municipality || "");
          setState(addr.state || "");
          setSkipCepAutoFill(true);
          setCepStatus({ type: "success", message: "Localização encontrada!" });
        } catch {
          setCepStatus({ type: "error", message: "Erro ao buscar endereço pela localização." });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        const messages: Record<number, string> = {
          1: "Permissão de localização negada.",
          2: "Localização indisponível.",
          3: "Tempo esgotado ao obter localização.",
        };
        setCepStatus({ type: "error", message: messages[error.code] || "Erro ao obter localização." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const renderBusinessCard = (type: string, label: string, iconPaths: React.ReactNode) => {
    const isSelected = businessType === type;
    return (
      <button
        type="button"
        onClick={() => setBusinessType(type)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          padding: "12px 8px",
          borderRadius: "8px",
          border: isSelected ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
          background: isSelected ? "#f7f7f8" : "white",
          cursor: "pointer",
          transition: "all 0.15s ease",
          width: "100%",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isSelected ? "#1a1a1a" : "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{iconPaths}</svg>
        <span style={{ fontSize: "11px", fontWeight: isSelected ? "500" : "400", color: isSelected ? "#1a1a1a" : "#666" }}>{label}</span>
      </button>
    );
  };

  useEffect(() => {
    if (skipCepAutoFill) {
      setSkipCepAutoFill(false);
      return;
    }
    const numbers = cep.replace(/\D/g, "");
    if (numbers.length !== 8) {
      if (numbers.length > 0) {
        setCepStatus({ type: "error", message: "CEP deve conter 8 dígitos." });
      } else {
        setCepStatus(null);
      }
      return;
    }
    setCepStatus({ type: "loading", message: "Buscando endereço..." });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
        const data: ViaCEPResponse & { erro?: boolean } = await response.json();
        if (data.erro) {
          setCepStatus({ type: "error", message: "CEP não encontrado." });
          return;
        }
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        setCepStatus({ type: "success", message: "Endereço encontrado!" });
      } catch {
        setCepStatus({ type: "error", message: "Erro ao buscar CEP." });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cep, skipCepAutoFill]);

  // Estilos Minimalistas
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#f7f7f8",
      padding: "5rem 1rem 2rem",
    },
    card: {
      background: "white",
      borderRadius: "14px",
      padding: "36px 32px",
      width: "100%",
      maxWidth: "420px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    progressBar: {
      marginBottom: "24px",
    },
    progressTrack: {
      width: "100%",
      height: "3px",
      background: "#efefef",
      borderRadius: "2px",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      background: "#1a1a1a",
      borderRadius: "2px",
      transition: "width 0.4s ease",
    },
    progressLabel: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "11px",
      color: "#999",
      marginTop: "6px",
      letterSpacing: "0.3px",
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a1a1a",
      marginBottom: "4px",
      letterSpacing: "-0.2px",
    },
    subtitle: {
      fontSize: "13px",
      color: "#999",
      marginBottom: "22px",
    },
    message: {
      fontSize: "13px",
      color: "#666",
      marginBottom: "22px",
      padding: "10px 14px",
      background: "#f7f7f8",
      borderRadius: "6px",
      borderLeft: "2px solid #1a1a1a",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "6px",
      border: "1.5px solid #eaeaea",
      fontSize: "14px",
      outline: "none",
      transition: "border-color 0.15s ease",
      background: "white",
      color: "#1a1a1a",
      boxSizing: "border-box" as const,
    },
    label: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#666",
      marginBottom: "4px",
      display: "block" as const,
    },
    button: {
      background: "#1a1a1a",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "opacity 0.15s ease",
      minWidth: "100px",
    },
    buttonSecondary: {
      background: "white",
      color: "#666",
      border: "1.5px solid #eaeaea",
      padding: "10px 24px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.15s ease",
      minWidth: "100px",
    },
    buttonOutline: {
      background: "transparent",
      color: "#666",
      border: "none",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.15s ease",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "4px",
    },
    checkbox: {
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      cursor: "pointer",
    },
  };

  return (
    <>
      <Header />
      <div style={styles.container}>
        <div style={styles.card}>
          <Toast
            show={toast.show}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast({ show: false, type: "error", message: "" })}
          />

          {/* Progresso */}
          <div style={styles.progressBar}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${getProgress()}%` }} />
            </div>
            <div style={styles.progressLabel}>
              <span>Progresso</span>
              <span>{getProgress()}%</span>
            </div>
          </div>

          {/* Mensagem */}
          <div style={styles.message}>{getMotivationalMessage()}</div>

          {/* Step 1 - Dados Pessoais */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 style={styles.title}>Dados Pessoais</h2>
                <p style={styles.subtitle}>Preencha suas informações básicas</p>
              </div>

              <div style={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
              </div>

              <div style={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="CPF / CNPJ"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatDocument(e.target.value))}
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
                {cpfCnpjStatus && (
                  <span style={{ fontSize: "12px", color: cpfCnpjStatus.type === "success" ? "#16a34a" : cpfCnpjStatus.type === "loading" ? "#d97706" : "#dc2626" }}>
                    {cpfCnpjStatus.type === "loading" ? "⏳" : cpfCnpjStatus.type === "success" ? "✓" : "✗"} {cpfCnpjStatus.message}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type={typePassword}
                  placeholder="Crie uma senha"
                  value={password}
                  onChange={(e) => { setPassWord(e.target.value); setPasswordError(""); }}
                  style={{ ...styles.input, flex: 1 }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", color: "#999" }}
                >
                  {typePassword === "password" ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              <div style={styles.inputGroup}>
                <input
                  type={typePassword}
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
              </div>

              {password.length > 0 && (
                <div style={{ background: "#f7f7f8", padding: "12px 14px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {passwordRequirements.map((req) => (
                    <span key={req.key} style={{ fontSize: "12px", color: checks[req.key] ? "#16a34a" : "#999" }}>
                      {checks[req.key] ? "✓" : "○"} {req.label}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={handleNext} style={styles.button}>
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 2 - Endereço */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <h2 style={styles.title}>Endereço</h2>
                <p style={styles.subtitle}>Preencha seu endereço completo</p>
              </div>

              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationLoading}
                style={{
                  ...styles.buttonOutline,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: locationLoading ? 0.5 : 1,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {locationLoading ? "Localizando..." : "Usar localização"}
              </button>

              <div style={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="CEP"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  maxLength={9}
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
                {cepStatus && (
                  <span style={{ fontSize: "12px", color: cepStatus.type === "success" ? "#16a34a" : cepStatus.type === "loading" ? "#d97706" : "#dc2626" }}>
                    {cepStatus.type === "loading" ? "⏳" : cepStatus.type === "success" ? "✓" : "✗"} {cepStatus.message}
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Rua"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                style={styles.input}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Número"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
              </div>

              <input
                type="text"
                placeholder="Bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                style={styles.input}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
                <input
                  type="text"
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  style={{ ...styles.input, width: "60px" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button type="button" onClick={handleNext} style={{ ...styles.button, flex: 1 }}>
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Tipo de Conta */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <h2 style={styles.title}>Tipo de Conta</h2>
                <p style={styles.subtitle}>Como você deseja se cadastrar?</p>
              </div>

              <button
                type="button"
                onClick={() => { setAccountType("establishment"); setHomeService(false); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: accountType === "establishment" ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                  background: accountType === "establishment" ? "#f7f7f8" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accountType === "establishment" ? "#1a1a1a" : "#999"} strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: accountType === "establishment" ? "#1a1a1a" : "#333" }}>Estabelecimento</span>
                </div>
                <span style={{ fontSize: "12px", color: "#999", paddingLeft: "28px" }}>Salão, clínica, barbearia ou negócio com endereço fixo</span>
              </button>

              <button
                type="button"
                onClick={() => { setAccountType("professional"); setHomeService(true); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: accountType === "professional" ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                  background: accountType === "professional" ? "#f7f7f8" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accountType === "professional" ? "#1a1a1a" : "#999"} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: accountType === "professional" ? "#1a1a1a" : "#333" }}>Profissional Individual</span>
                </div>
                <span style={{ fontSize: "12px", color: "#999", paddingLeft: "28px" }}>Autônomo que atende em casa ou a domicílio</span>
              </button>

              {accountType === "professional" && (
                <div style={{ background: "#f7f7f8", padding: "14px", borderRadius: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#333", display: "block", marginBottom: "4px" }}>Atendimento domiciliar?</span>
                  <span style={{ fontSize: "12px", color: "#999", display: "block", marginBottom: "8px" }}>Seus clientes poderão agendar atendimento no local deles</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setHomeService(true)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "4px",
                        border: homeService ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                        background: homeService ? "#1a1a1a" : "white",
                        color: homeService ? "white" : "#666",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeService(false)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "4px",
                        border: !homeService ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                        background: !homeService ? "white" : "white",
                        color: !homeService ? "#1a1a1a" : "#666",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button type="button" onClick={handleNext} style={{ ...styles.button, flex: 1 }}>
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Tipo de Negócio */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <h2 style={styles.title}>Seu Negócio</h2>
                <p style={styles.subtitle}>Selecione a categoria que melhor descreve o que você faz</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {renderBusinessCard("barbearia", "Barbearia", <><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></>)}
                {renderBusinessCard("salao", "Salão", <><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z" /><path d="M12 12v10" /><path d="M8 22h8" /></>)}
                {renderBusinessCard("clinica-estetica", "Clínica", <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>)}
                {renderBusinessCard("nail", "Nail", <><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12l8-8" /><circle cx="12" cy="12" r="3" /></>)}
                {renderBusinessCard("cabeleireiro", "Cabeleireiro", <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>)}
                {renderBusinessCard("massoterapia", "Massagem", <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>)}
                {renderBusinessCard("maquiador", "Maquiagem", <><path d="M12 3l1.912 5.813h6.147l-4.985 3.587 1.912 5.813L12 14.626l-4.986 3.587 1.912-5.813-4.985-3.587h6.147z" /></>)}
                {renderBusinessCard("tatuador", "Tatuagem", <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>)}
                {renderBusinessCard("personal", "Personal", <><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></>)}
                {renderBusinessCard("outro", "Outro", <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>)}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button type="button" onClick={handleNext} style={{ ...styles.button, flex: 1 }}>
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 5 - Estilo de Atendimento */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <h2 style={styles.title}>Estilo da IA</h2>
                <p style={styles.subtitle}>Como a IA deve atender seus clientes?</p>
              </div>

              <button
                type="button"
                onClick={() => { setAiStyle("direto"); setCustomAiStyle(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: aiStyle === "direto" ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                  background: aiStyle === "direto" ? "#f7f7f8" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "20px" }}>🎯</span>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1a1a1a", display: "block" }}>Direto ao ponto</span>
                  <span style={{ fontSize: "12px", color: "#999" }}>Respostas curtas e objetivas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setAiStyle("amigavel"); setCustomAiStyle(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: aiStyle === "amigavel" ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                  background: aiStyle === "amigavel" ? "#f7f7f8" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "20px" }}>😊</span>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1a1a1a", display: "block" }}>Amigável e acolhedor</span>
                  <span style={{ fontSize: "12px", color: "#999" }}>Conversa natural e simpática</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiStyle("profissional")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: aiStyle === "profissional" ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                  background: aiStyle === "profissional" ? "#f7f7f8" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "20px" }}>✍️</span>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#1a1a1a", display: "block" }}>Personalizado</span>
                  <span style={{ fontSize: "12px", color: "#999" }}>Você descreve como quer que atenda</span>
                </div>
              </button>

              {aiStyle === "profissional" && (
                <textarea
                  placeholder="Ex: Sempre cumprimento pelo nome, pergunto como foi a semana..."
                  value={customAiStyle}
                  onChange={(e) => setCustomAiStyle(e.target.value)}
                  style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#eaeaea"}
                />
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button type="button" onClick={handleNext} style={{ ...styles.button, flex: 1 }}>
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 6 - Jornada de Trabalho */}
          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 style={styles.title}>Jornada de Trabalho</h2>
                <p style={styles.subtitle}>Defina seus horários de atendimento</p>
              </div>

              {/* Horário */}
              <div style={{
                background: "#f7f7f8",
                padding: "18px",
                borderRadius: "8px",
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px"
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>
                    Horário
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[
                      { label: "Manhã", start: "08:00", end: "12:00" },
                      { label: "Integral", start: "09:00", end: "18:00" },
                      { label: "Noite", start: "14:00", end: "22:00" },
                    ].map((preset) => {
                      const isActive = workStart === preset.start && workEnd === preset.end;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setWorkStart(preset.start);
                            setWorkEnd(preset.end);
                          }}
                          style={{
                            padding: "4px 14px",
                            borderRadius: "4px",
                            border: isActive ? "1.5px solid #1a1a1a" : "1px solid #d0d0d0",
                            background: isActive ? "#1a1a1a" : "white",
                            color: isActive ? "white" : "#1a1a1a",
                            fontSize: "12px",
                            fontWeight: isActive ? "500" : "400",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            letterSpacing: "0.3px",
                            boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.borderColor = "#1a1a1a";
                              e.currentTarget.style.background = "#f0f0f0";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.borderColor = "#d0d0d0";
                              e.currentTarget.style.background = "white";
                            }
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center"
                }}>
                  {/* Entrada */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "1px"
                    }}>
                      {workStart || "--:--"}
                    </div>
                    <div style={{ fontSize: "9px", color: "#999", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Entrada
                    </div>
                  </div>

                  {/* Controles Entrada */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (workStart) {
                          const [h, m] = workStart.split(":").map(Number);
                          const date = new Date();
                          date.setHours(h, m + 30);
                          if (date.getHours() < 24) {
                            setWorkStart(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
                          }
                        } else {
                          setWorkStart("09:00");
                        }
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #eaeaea",
                        borderRadius: "3px",
                        padding: "0 6px",
                        cursor: "pointer",
                        fontSize: "11px",
                        color: "#999",
                        height: "18px",
                        lineHeight: "18px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (workStart) {
                          const [h, m] = workStart.split(":").map(Number);
                          const date = new Date();
                          date.setHours(h, m - 30);
                          if (date.getHours() >= 0) {
                            setWorkStart(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
                          }
                        }
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #eaeaea",
                        borderRadius: "3px",
                        padding: "0 6px",
                        cursor: "pointer",
                        fontSize: "11px",
                        color: "#999",
                        height: "18px",
                        lineHeight: "18px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      –
                    </button>
                  </div>

                  <span style={{ fontSize: "16px", color: "#ddd", fontWeight: "300" }}>—</span>

                  {/* Controles Saída */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (workEnd) {
                          const [h, m] = workEnd.split(":").map(Number);
                          const date = new Date();
                          date.setHours(h, m + 30);
                          if (date.getHours() < 24) {
                            setWorkEnd(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
                          }
                        } else {
                          setWorkEnd("18:00");
                        }
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #eaeaea",
                        borderRadius: "3px",
                        padding: "0 6px",
                        cursor: "pointer",
                        fontSize: "11px",
                        color: "#999",
                        height: "18px",
                        lineHeight: "18px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (workEnd) {
                          const [h, m] = workEnd.split(":").map(Number);
                          const date = new Date();
                          date.setHours(h, m - 30);
                          if (date.getHours() >= 0) {
                            setWorkEnd(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
                          }
                        }
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #eaeaea",
                        borderRadius: "3px",
                        padding: "0 6px",
                        cursor: "pointer",
                        fontSize: "11px",
                        color: "#999",
                        height: "18px",
                        lineHeight: "18px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      –
                    </button>
                  </div>

                  {/* Saída */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "1px"
                    }}>
                      {workEnd || "--:--"}
                    </div>
                    <div style={{ fontSize: "9px", color: "#999", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Saída
                    </div>
                  </div>
                </div>
              </div>

              {/* Dias da semana */}
              <div style={{
                background: "#f7f7f8",
                padding: "16px 18px",
                borderRadius: "8px",
              }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#1a1a1a",
                  marginBottom: "10px"
                }}>
                  Dias da semana
                </div>

                <div style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "space-between"
                }}>
                  {[
                    { value: 1, label: "Seg" },
                    { value: 2, label: "Ter" },
                    { value: 3, label: "Qua" },
                    { value: 4, label: "Qui" },
                    { value: 5, label: "Sex" },
                    { value: 6, label: "Sáb" },
                    { value: 0, label: "Dom" },
                  ].map((day) => {
                    const isActive = workDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          borderRadius: "4px",
                          border: isActive ? "1.5px solid #1a1a1a" : "1px solid #eaeaea",
                          background: isActive ? "#1a1a1a" : "white",
                          color: isActive ? "white" : "#666",
                          fontSize: "11px",
                          fontWeight: isActive ? "500" : "400",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          letterSpacing: "0.3px",
                        }}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>

                {workDays.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    marginTop: "10px",
                    fontSize: "11px",
                    color: "#dc2626"
                  }}>
                    Selecione pelo menos um dia
                  </div>
                )}
              </div>

              {/* Resumo */}
              {(workStart && workEnd && workDays.length > 0) && (
                <div style={{
                  background: "#f0f0f0",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#1a1a1a",
                  textAlign: "center",
                  letterSpacing: "0.3px"
                }}>
                  {workStart} – {workEnd}
                  <span style={{ color: "#ccc", margin: "0 8px" }}>·</span>
                  {workDays.map(d => {
                    const days: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };
                    return days[d];
                  }).join(", ")}
                </div>
              )}

              {/* Botões */}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    ...styles.button,
                    flex: 1,
                    opacity: (!workStart || !workEnd || workDays.length === 0) ? 0.4 : 1,
                    cursor: (!workStart || !workEnd || workDays.length === 0) ? "not-allowed" : "pointer",
                  }}
                  disabled={!workStart || !workEnd || workDays.length === 0}
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* Step 7 - Confirmação */}
          {step === 7 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <h2 style={styles.title}>Confirmar Dados</h2>
                <p style={styles.subtitle}>Revise suas informações antes de finalizar</p>
              </div>

              <div style={{ background: "#f7f7f8", padding: "14px", borderRadius: "6px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Nome</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a" }}>{name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Documento</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a" }}>{cpfCnpj}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Endereço</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a", textAlign: "right" }}>
                    {street}, {addressNumber}
                    <br />
                    {neighborhood} - {city}/{state}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Conta</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a" }}>
                    {accountType === "establishment" ? "Estabelecimento" : "Profissional"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Negócio</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a" }}>
                    {(() => { const m: Record<string, string> = { "barbearia": "Barbearia", "salao": "Salão", "clinica-estetica": "Clínica", "nail": "Nail", "cabeleireiro": "Cabeleireiro", "massoterapia": "Massagem", "maquiador": "Maquiagem", "tatuador": "Tatuagem", "personal": "Personal", "outro": "Outro" }; return m[businessType] || businessType; })()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ color: "#999" }}>Jornada</span>
                  <span style={{ fontWeight: "500", color: "#1a1a1a" }}>
                    {workStart} – {workEnd}
                  </span>
                </div>
              </div>

              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  style={{ marginTop: "2px", width: "16px", height: "16px", accentColor: "#1a1a1a" }}
                />
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                  Li e aceito a <a href="#" style={{ color: "#1a1a1a", textDecoration: "underline" }}>Política de Privacidade</a> e os <a href="#" style={{ color: "#1a1a1a", textDecoration: "underline" }}>Termos de Uso</a>
                </span>
              </label>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={handlePrev} style={styles.buttonSecondary}>
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!privacyAccepted || isSubmitting}
                  style={{
                    ...styles.button,
                    flex: 1,
                    opacity: (!privacyAccepted || isSubmitting) ? 0.4 : 1,
                    cursor: (!privacyAccepted || isSubmitting) ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg className="animate-spin" style={{ width: "16px", height: "16px" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Criando...
                    </span>
                  ) : (
                    "Finalizar"
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-4">
            <Link
              to="/login"
              className="text-sm text-gray-400 underline hover:text-gray-500 transition-colors"
            >
              Já tem conta? Entrar
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </>
  );
};

export default SignUp;