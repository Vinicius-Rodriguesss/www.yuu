import { useEffect, useState, type CSSProperties } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { validatePassword, isAllValid, isPasswordMatch, passwordRequirements, validateFullName, validateCPF, validateCEP, validateStreet, validateNumber, validateNeighborhood, validateCity, validateState, isAddressValid, formatCEP, type ViaCEPResponse } from "./passwordValidation";
import Toast from "../Components/Toast";
import Header from "@/Components/Header";

const SignUp = () => {
  // UseState
  const [step, setStep] = useState(1);
  const [typePassword, setTypePassWord] = useState('password')


  // Verificar as senhas
  const [password, setPassWord] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  // Estado que ira verificar
  // Posso usar essa variavel para mostrar a messagem
  const [passwordError, setPasswordError] = useState("");
  // nameValidation.message

  // Validação de CPF/CNPJ
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cpfCnpjStatus, setCpfCnpjStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  // Endereço
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

  // Tipo de conta
  const [accountType, setAccountType] = useState<"establishment" | "professional" | "">("");
  const [homeService, setHomeService] = useState(false);

  // Tipo de negócio
  const [businessType, setBusinessType] = useState("");

  // Estilo de atendimento da IA
  const [aiStyle, setAiStyle] = useState<"direto" | "amigavel" | "profissional" | "">("");
  const [customAiStyle, setCustomAiStyle] = useState("");

  // Confirmação e privacidade
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success" | "warning" | "info"; message: string }>({ show: false, type: "error", message: "" });

  // Envio do formulário
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validação de senha forte em tempo real
  const checks = validatePassword(password);
  const allValid = isAllValid(checks);
  const nameValidation = validateFullName(name);

  // Aqui alter entre os Steps
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
      if (!privacyAccepted) {
        setToast({ show: true, type: "warning", message: "Você precisa aceitar a Política de Privacidade." });
        return;
      }
      // Enviar dados do cadastro
      handleSubmit();
      return;
    }
    setStep(step + 1);
  };

  // Simular envio para API
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setToast({ show: false, type: "error", message: "" });

    // Montar objeto com todos os dados do formulário
    const formData = {
      // Dados Pessoais (Step 1)
      name: name,
      document: cpfCnpj,
      password: password,

      // Endereço (Step 2)
      address: {
        cep: cep,
        street: street,
        number: addressNumber,
        complement: complement || undefined,
        neighborhood: neighborhood,
        city: city,
        state: state,
      },

      // Tipo de Conta (Step 3)
      accountType: accountType,
      homeService: homeService,

      // Tipo de Negócio (Step 4)
      businessType: businessType,

      // Estilo de Atendimento IA (Step 5)
      aiStyle: aiStyle,
      customAiStyle: customAiStyle || undefined,

      // Confirmação (Step 6)
      privacyAccepted: privacyAccepted,
      createdAt: new Date().toISOString(),
    };

    try {
      // Simular delay de rede (1.5 segundos)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simular chamada API
      console.log("📤 Enviando dados para API:", formData);

      // Simular resposta da API (sucesso)
      const mockResponse = {
        success: true,
        userId: "usr_" + Math.random().toString(36).substr(2, 9),
        message: "Cadastro realizado com sucesso!",
        data: formData,
      };

      console.log("✅ Resposta da API:", mockResponse);

      // Mostrar mensagem de sucesso
      setToast({ show: true, type: "success", message: "Cadastro realizado com sucesso! Redirecionando..." });

      // Simular redirecionamento após 2 segundos
      setTimeout(() => {
        console.log("🔄 Redirecionando usuário...");
        // Aqui você colocaria: navigate('/login') ou window.location.href = '/login';
      }, 2000);

    } catch (error) {
      // Simular erro da API
      console.error("❌ Erro ao enviar cadastro:", error);
      setToast({ show: true, type: "error", message: "Erro ao realizar cadastro. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aqui Mostra a senha 
  const togglePasswordVisibility = () => {
    setTypePassWord((prev) => (prev === "password" ? "text" : "password"));
  };

  const style: Record<string, CSSProperties> = {
    windowsignup: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#f5f5f7",
      padding: "20px",
      zIndex: "99999",
    },
    formContainer: {
      background: "white",
      borderRadius: "12px",
      padding: "32px",
      width: "100%",
      maxWidth: "480px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      zIndex: "99999"
    },
    stepTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a1a1a",
      marginBottom: "4px",
      display: "block"
    },
    stepSubtitle: {
      fontSize: "13px",
      color: "#666",
      marginBottom: "24px",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "6px",
      border: "1px solid #e0e0e0",
      fontSize: "14px",
      transition: "border-color 0.2s",
      outline: "none",
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
      transition: "opacity 0.2s",
    },
    buttonSecondary: {
      background: "white",
      color: "#666",
      border: "1px solid #e0e0e0",
      padding: "10px 24px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
    },
  };



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

  // Validar CPF/CNPJ
  useEffect(() => {
    const numbers = cpfCnpj.replace(/\D/g, "");

    if (!numbers) {
      setCpfCnpjStatus(null);
      return;
    }

    // CPF: validação local instantânea (sem API)
    if (numbers.length === 11) {
      const result = validateCPF(numbers);
      setCpfCnpjStatus({
        type: result.valid ? "success" : "error",
        message: result.message,
      });
      return;
    }

    // CNPJ: consulta à Brasil API (com debounce)
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

    // Documento incompleto
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

  // Buscar endereço via geolocalização do navegador
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

  // Função auxiliar para renderizar cards de negócio
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
          gap: "6px",
          padding: "12px",
          borderRadius: "8px",
          border: isSelected ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
          background: isSelected ? "#f5f5f7" : "white",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isSelected ? "#1a1a1a" : "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{iconPaths}</svg>
        <span style={{ fontSize: "12px", fontWeight: "500", color: isSelected ? "#1a1a1a" : "#666" }}>{label}</span>
      </button>
    );
  };

  // Busca automática de CEP via ViaCEP
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




  return (
    // Aqui estamos centralizando o form

    <div style={style.bodySignUp}>

    <Header />
      <div style={style.windowsignup}>

        <div style={style.formContainer}>

          {/* Toast de notificação */}
          <Toast
            show={toast.show}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast({ show: false, type: "error", message: "" })}
          />

          {/* Step 1 - Dados Pessoais */}
          {step === 1 && (
            <div className="step-info-user flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Dados Pessoais</span>
                <span style={style.stepSubtitle}>Preencha suas informações básicas</span>
              </div>

              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={style.input}
              />
              <input
                type="text"
                placeholder="CPF/CNPJ"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatDocument(e.target.value))}
                style={style.input}
              />
              {cpfCnpjStatus && (
                <span className={`text-xs ${cpfCnpjStatus.type === "success" ? "text-green-500" : cpfCnpjStatus.type === "loading" ? "text-yellow-500" : "text-red-500"}`}>
                  {cpfCnpjStatus.type === "loading" ? "⏳" : cpfCnpjStatus.type === "success" ? "✓" : "✗"} {cpfCnpjStatus.message}
                </span>
              )}


              <div className="flex items-center gap-2">
                <input
                  type={typePassword}
                  placeholder="Crie uma senha"
                  value={password}
                  onChange={(e) => { setPassWord(e.target.value); setPasswordError(""); }}
                  style={{ ...style.input, width: "calc(100% - 50px)" }}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                >
                  {typePassword === "password" ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type={typePassword}
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  style={style.input}
                />
              </div>

              {/* Requisitos da senha em tempo real */}
              {password.length > 0 && (
                <div className="text-xs text-gray-500 flex flex-col gap-1" style={{ background: "#f9f9f9", padding: "12px", borderRadius: "8px" }}>
                  {passwordRequirements.map((req) => (
                    <span key={req.key} className={checks[req.key] ? "text-green-500" : "text-red-500"} style={{ fontWeight: checks[req.key] ? "600" : "400" }}>
                      {checks[req.key] ? "✓" : "✗"} {req.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={handleNext}
                  style={style.button}
                >
                  Próximo →
                </button>
              </div>

            </div>

          )}

          {/* Step 2 - Endereço */}
          {step === 2 && (
            <div className="step-address flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Endereço</span>
                <span style={style.stepSubtitle}>Preencha seu endereço completo</span>
              </div>

              {/* Botão usar localização */}
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationLoading}
                style={{
                  ...style.buttonSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: locationLoading ? 0.5 : 1,
                  cursor: locationLoading ? "not-allowed" : "pointer",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {locationLoading ? "Localizando..." : "📍 Usar minha localização"}
              </button>

              {/* CEP */}
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="CEP"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  maxLength={9}
                  style={style.input}
                />
                {cepStatus && (
                  <span className={`text-xs ${cepStatus.type === "success" ? "text-green-500" : cepStatus.type === "loading" ? "text-yellow-500" : "text-red-500"}`} style={{ fontWeight: "500" }}>
                    {cepStatus.type === "loading" ? "⏳" : cepStatus.type === "success" ? "✓" : "✗"} {cepStatus.message}
                  </span>
                )}
              </div>

              {/* Rua */}
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Rua"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  style={style.input}
                />
                {street && !validateStreet(street).valid && (
                  <span className="text-xs text-red-500">✗ {validateStreet(street).message}</span>
                )}
              </div>

              {/* Número + Complemento */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <input
                    type="text"
                    placeholder="Número"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    style={style.input}
                  />
                  {addressNumber && !validateNumber(addressNumber).valid && (
                    <span className="text-xs text-red-500">✗ {validateNumber(addressNumber).message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <input
                    type="text"
                    placeholder="Complemento (opcional)"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    style={style.input}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  style={style.input}
                />
                {neighborhood && !validateNeighborhood(neighborhood).valid && (
                  <span className="text-xs text-red-500">✗ {validateNeighborhood(neighborhood).message}</span>
                )}
              </div>

              {/* Cidade + Estado */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={style.input}
                  />
                  {city && !validateCity(city).valid && (
                    <span className="text-xs text-red-500">✗ {validateCity(city).message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 w-20">
                  <input
                    type="text"
                    placeholder="UF"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    style={style.input}
                  />
                  {state && !validateState(state).valid && (
                    <span className="text-xs text-red-500">✗ {validateState(state).message}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  style={style.buttonSecondary}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={style.button}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Tipo de Conta */}
          {step === 3 && (
            <div className="step-account-type flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Tipo de Conta</span>
                <span style={style.stepSubtitle}>Como você deseja se cadastrar?</span>
              </div>

              {/* Opção Estabelecimento */}
              <button
                type="button"
                onClick={() => { setAccountType("establishment"); setHomeService(false); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: accountType === "establishment" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                  background: accountType === "establishment" ? "#f5f5f7" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accountType === "establishment" ? "#1a1a1a" : "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: accountType === "establishment" ? "#1a1a1a" : "#333" }}>Estabelecimento</span>
                </div>
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>Salão, clínica, barbearia ou qualquer negócio com endereço fixo.</span>
              </button>

              {/* Opção Profissional Individual */}
              <button
                type="button"
                onClick={() => { setAccountType("professional"); setHomeService(true); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: accountType === "professional" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                  background: accountType === "professional" ? "#f5f5f7" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accountType === "professional" ? "#1a1a1a" : "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: accountType === "professional" ? "#1a1a1a" : "#333" }}>Profissional Individual</span>
                </div>
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>Autônomo que atende em casa, no estabelecimento ou a domicílio.</span>
              </button>

              {/* Atendimento domiciliar - só aparece para profissional */}
              {accountType === "professional" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "6px", border: "1px solid #e8e8e8", background: "#fafafa", padding: "12px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#333" }}>Deseja disponibilizar atendimento domiciliar?</span>
                  <span style={{ fontSize: "12px", color: "#666" }}>Seus clientes poderão agendar um atendimento no local deles.</span>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setHomeService(true)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "6px",
                        border: homeService ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                        background: homeService ? "#1a1a1a" : "white",
                        color: homeService ? "white" : "#666",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s",
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
                        borderRadius: "6px",
                        border: !homeService ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                        background: !homeService ? "white" : "white",
                        color: !homeService ? "#1a1a1a" : "#666",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  style={style.buttonSecondary}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={style.button}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Tipo de Negócio */}
          {step === 4 && (
            <div className="step-business-type flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Tipo de Negócio</span>
                <span style={style.stepSubtitle}>Selecione a categoria que melhor descreve o que você faz.</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {renderBusinessCard("barbearia", "Barbearia", <><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></>)}
                {renderBusinessCard("salao", "Salão de Beleza", <><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z" /><path d="M12 12v10" /><path d="M8 22h8" /></>)}
                {renderBusinessCard("clinica-estetica", "Clínica Estética", <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>)}
                {renderBusinessCard("nail", "Nail Designer", <><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12l8-8" /><circle cx="12" cy="12" r="3" /></>)}
                {renderBusinessCard("cabeleireiro", "Cabeleireiro(a)", <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>)}
                {renderBusinessCard("massoterapia", "Massoterapia / Spa", <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>)}
                {renderBusinessCard("maquiador", "Maquiador(a)", <><path d="M12 3l1.912 5.813h6.147l-4.985 3.587 1.912 5.813L12 14.626l-4.986 3.587 1.912-5.813-4.985-3.587h6.147z" /></>)}
                {renderBusinessCard("tatuador", "Tatuador(a)", <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>)}
                {renderBusinessCard("personal", "Personal Trainer", <><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></>)}
                {renderBusinessCard("outro", "Outro", <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>)}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  style={style.buttonSecondary}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={style.button}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Step 5 - Estilo de Atendimento da IA */}
          {step === 5 && (
            <div className="step-ai-style flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Estilo de Atendimento da IA</span>
                <span style={style.stepSubtitle}>Como a IA deve atender seus clientes?</span>
              </div>

              {/* Opção 1 - Direto ao ponto */}
              <button
                type="button"
                onClick={() => { setAiStyle("direto"); setCustomAiStyle(""); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: aiStyle === "direto" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                  background: aiStyle === "direto" ? "#f5f5f7" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "500", color: aiStyle === "direto" ? "#1a1a1a" : "#333" }}>🎯 Direto ao ponto</span>
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>Respostas curtas e objetivas, sem enrolação.</span>
              </button>

              {/* Opção 2 - Amigável e acolhedor */}
              <button
                type="button"
                onClick={() => { setAiStyle("amigavel"); setCustomAiStyle(""); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: aiStyle === "amigavel" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                  background: aiStyle === "amigavel" ? "#f5f5f7" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "500", color: aiStyle === "amigavel" ? "#1a1a1a" : "#333" }}>😊 Amigável e acolhedor</span>
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>Conversa com naturalidade e simpatia.</span>
              </button>

              {/* Opção 3 - Personalizado */}
              <button
                type="button"
                onClick={() => setAiStyle("profissional")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  padding: "16px",
                  borderRadius: "8px",
                  border: aiStyle === "profissional" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
                  background: aiStyle === "profissional" ? "#f5f5f7" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "500", color: aiStyle === "profissional" ? "#1a1a1a" : "#333" }}>✍️ Personalizado</span>
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>Você descreve como quer que a IA atenda.</span>
              </button>

              {/* Campo de texto personalizado */}
              {aiStyle === "profissional" && (
                <div className="flex flex-col gap-2">
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#333" }}>Descreva como você atende seus clientes:</span>
                  <textarea
                    style={{ ...style.input, minHeight: "80px", resize: "vertical" }}
                    placeholder="Ex: Sempre cumprimento pelo nome, pergunto como foi a semana..."
                    value={customAiStyle}
                    onChange={(e) => setCustomAiStyle(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  style={style.buttonSecondary}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={style.button}
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Step 6 - Confirmação */}
          {step === 6 && (
            <div className="step-confirmation flex flex-col gap-4">
              <div>
                <span style={style.stepTitle}>Confirme seus dados</span>
                <span style={style.stepSubtitle}>Verifique se tudo está correto antes de finalizar.</span>
              </div>

              {/* Dados pessoais */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "8px", border: "1px solid #e8e8e8", padding: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>Dados Pessoais</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Nome</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>CPF/CNPJ</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{cpfCnpj}</span>
                </div>
              </div>

              {/* Endereço */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "8px", border: "1px solid #e8e8e8", padding: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>Endereço</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>CEP</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{cep}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Rua</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{street}{addressNumber ? `, ${addressNumber}` : ""}{complement ? ` - ${complement}` : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Bairro</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{neighborhood}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Cidade/UF</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{city}/{state}</span>
                </div>
              </div>

              {/* Tipo de conta */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "8px", border: "1px solid #e8e8e8", padding: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>Tipo de Conta</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Tipo</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{accountType === "establishment" ? "Estabelecimento" : "Profissional Individual"}</span>
                </div>
                {accountType === "professional" && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#666" }}>Atendimento domiciliar</span>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{homeService ? "Sim" : "Não"}</span>
                  </div>
                )}
              </div>

              {/* Tipo de negócio */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "8px", border: "1px solid #e8e8e8", padding: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>Tipo de Negócio</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Categoria</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{(() => { const m: Record<string, string> = { "barbearia": "Barbearia", "salao": "Salão de Beleza", "clinica-estetica": "Clínica Estética", "nail": "Nail Designer", "cabeleireiro": "Cabeleireiro(a)", "massoterapia": "Massoterapia / Spa", "maquiador": "Maquiador(a)", "tatuador": "Tatuador(a)", "personal": "Personal Trainer", "outro": "Outro" }; return m[businessType] || businessType; })()}</span>
                </div>
              </div>

              {/* Estilo de atendimento */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderRadius: "8px", border: "1px solid #e8e8e8", padding: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>Estilo de Atendimento</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>Estilo</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{(() => { const m: Record<string, string> = { "direto": "Direto ao ponto", "amigavel": "Amigável e acolhedor", "profissional": "Personalizado" }; return m[aiStyle] || ""; })()}</span>
                </div>
                {aiStyle === "profissional" && customAiStyle && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#666" }}>Descrição</span>
                    <span style={{ fontSize: "12px", color: "#333", background: "#fafafa", padding: "8px", borderRadius: "6px" }}>{customAiStyle}</span>
                  </div>
                )}
              </div>

              {/* Política de privacidade */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginTop: "6px" }}>
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  style={{ marginTop: "2px", width: "16px", height: "16px", accentColor: "#1a1a1a" }}
                />
                <span style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                  Li e aceito a <a href="#" style={{ color: "#1a1a1a", textDecoration: "underline" }}>Política de Privacidade</a> e os <a href="#" style={{ color: "#1a1a1a", textDecoration: "underline" }}>Termos de Uso</a>.
                </span>
              </label>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrev}
                  style={style.buttonSecondary}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!privacyAccepted || isSubmitting}
                  style={{
                    ...style.button,
                    opacity: (!privacyAccepted || isSubmitting) ? 0.5 : 1,
                    cursor: (!privacyAccepted || isSubmitting) ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg className="animate-spin" style={{ width: "16px", height: "16px" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    "Criar conta"
                  )}
                </button>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>

  );
};

export default SignUp;