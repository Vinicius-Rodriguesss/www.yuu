import { useEffect, useState, type CSSProperties } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { validatePassword, isAllValid, isPasswordMatch, passwordRequirements, validateFullName, validateCPF, validateCEP, validateStreet, validateNumber, validateNeighborhood, validateCity, validateState, isAddressValid, formatCEP, type ViaCEPResponse } from "./passwordValidation";

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
  if (step === 1) {
   if (!nameValidation.valid) return;
   if (!cpfCnpjStatus || cpfCnpjStatus.type !== "success") return;
   if (!allValid) return;
   if (!isPasswordMatch(password, confirmPassword)) return;
  }

  if (step === 2) {
   if (!isAddressValid(cep, street, addressNumber, neighborhood, city, state)) return;
  }

  if (step === 3) {
   if (!accountType) return;
  }

  if (step === 4) {
   if (!businessType) return;
  }

  if (step === 5) {
   if (!aiStyle) return;
   if (aiStyle === "profissional" && !customAiStyle.trim()) return;
  }

  if (step === 6) {
   if (!privacyAccepted) return;
   // TODO: enviar dados do cadastro
   return;
  }
  setStep(step + 1);
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
   height: "100vh"
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
  <div style={style.windowsignup}>
   <form action="" method="post" className="border p-4">

    {/* Aqui é cada Step  */}

    {/* Step 1 - Dados Pessoais */}
    {step === 1 && (
     <div className="step-info-user flex flex-col gap-4">
      <span>Dados do Clinte</span>

      <input type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="text" placeholder="CPF/CNPJ" value={cpfCnpj} onChange={(e) => setCpfCnpj(formatDocument(e.target.value))} />
      {cpfCnpjStatus && (
       <span className={`text-xs ${cpfCnpjStatus.type === "success" ? "text-green-500" : cpfCnpjStatus.type === "loading" ? "text-yellow-500" : "text-red-500"}`}>
        {cpfCnpjStatus.type === "loading" ? "⏳" : cpfCnpjStatus.type === "success" ? "✓" : "✗"} {cpfCnpjStatus.message}
       </span>
      )}


      <div className="flex items-center gap-2">
       {/* Preciso pegar esse valor */}
       <input type={typePassword} placeholder="Crie uma senha" value={password} onChange={(e) => { setPassWord(e.target.value); setPasswordError(""); }} />
       <button type="button" onClick={togglePasswordVisibility}>
        {typePassword === "password" ? <FiEyeOff /> : <FiEye />}
       </button>
      </div>

      <div className="flex items-center gap-2">
       {/* E esse valor */}
       <input type={typePassword} placeholder="Confirme a senha" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} />
      </div>


      {/* Requisitos da senha em tempo real */}
      {password.length > 0 && (
       <div className="text-xs text-gray-500 flex flex-col gap-1">
        {passwordRequirements.map((req) => (
         <span key={req.key} className={checks[req.key] ? "text-green-500" : "text-red-500"}>
          {checks[req.key] ? "✓" : "✗"} {req.label}
         </span>
        ))}
       </div>
      )}
      {/* Termina aqui */}

      <div className="flex justify-between mt-5">
       <div></div>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>

     </div>

    )}

    {/* Step 2 - Endereço */}
    {step === 2 && (
     <div className="step-address flex flex-col gap-4">
      <span className="text-lg font-semibold">Endereço</span>

      {/* Botão usar localização */}
      <button
       type="button"
       onClick={handleUseLocation}
       disabled={locationLoading}
       className="flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
       {locationLoading ? "Localizando..." : "Usar minha localização"}
      </button>

      {/* CEP */}
      <div className="flex flex-col gap-1">
       <input
        type="text"
        placeholder="CEP"
        value={cep}
        onChange={(e) => setCep(formatCEP(e.target.value))}
        maxLength={9}
       />
       {cepStatus && (
        <span className={`text-xs ${cepStatus.type === "success" ? "text-green-500" : cepStatus.type === "loading" ? "text-yellow-500" : "text-red-500"}`}>
         {cepStatus.type === "loading" ? "⏳" : cepStatus.type === "success" ? "✓" : "✗"} {cepStatus.message}
        </span>
       )}
      </div>

      {/* Rua */}
      <div className="flex flex-col gap-1">
       <input
        type="text"
        placeholder="Rua *"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
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
         placeholder="Número *"
         value={addressNumber}
         onChange={(e) => setAddressNumber(e.target.value)}
        />
        {addressNumber && !validateNumber(addressNumber).valid && (
         <span className="text-xs text-red-500">✗ {validateNumber(addressNumber).message}</span>
        )}
       </div>
       <div className="flex flex-col gap-1 flex-1">
        <input
         type="text"
         placeholder="Complemento"
         value={complement}
         onChange={(e) => setComplement(e.target.value)}
        />
       </div>
      </div>

      {/* Bairro */}
      <div className="flex flex-col gap-1">
       <input
        type="text"
        placeholder="Bairro *"
        value={neighborhood}
        onChange={(e) => setNeighborhood(e.target.value)}
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
         placeholder="Cidade *"
         value={city}
         onChange={(e) => setCity(e.target.value)}
        />
        {city && !validateCity(city).valid && (
         <span className="text-xs text-red-500">✗ {validateCity(city).message}</span>
        )}
       </div>
       <div className="flex flex-col gap-1 w-20">
        <input
         type="text"
         placeholder="UF *"
         value={state}
         onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
         maxLength={2}
        />
        {state && !validateState(state).valid && (
         <span className="text-xs text-red-500">✗ {validateState(state).message}</span>
        )}
       </div>
      </div>

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>
     </div>
    )}

    {/* Step 3 - Tipo de Conta */}
    {step === 3 && (
     <div className="step-account-type flex flex-col gap-4">
      <span className="text-lg font-semibold">Como você deseja se cadastrar?</span>

      {/* Opção Estabelecimento */}
      <button
       type="button"
       onClick={() => { setAccountType("establishment"); setHomeService(false); }}
       className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all ${accountType === "establishment" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
      >
       <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        <span className="font-semibold">Estabelecimento</span>
       </div>
       <span className="text-sm text-gray-500">Salão, clínica, barbearia ou qualquer negócio com endereço fixo.</span>
      </button>

      {/* Opção Profissional Individual */}
      <button
       type="button"
       onClick={() => setAccountType("professional")}
       className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all ${accountType === "professional" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
      >
       <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        <span className="font-semibold">Profissional Individual</span>
       </div>
       <span className="text-sm text-gray-500">Autônomo que atende em casa, no estabelecimento ou a domicílio.</span>
      </button>

      {/* Atendimento domiciliar - só aparece para profissional */}
      {accountType === "professional" && (
       <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <span className="text-sm font-medium">Deseja disponibilizar atendimento domiciliar?</span>
        <span className="text-xs text-gray-500">Seus clientes poderão agendar um atendimento no local deles.</span>
        <div className="flex gap-3 mt-1">
         <button
          type="button"
          onClick={() => setHomeService(true)}
          className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-all ${homeService ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
         >
          Sim, atender a domicílio
         </button>
         <button
          type="button"
          onClick={() => setHomeService(false)}
          className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-all ${!homeService ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}
         >
          Não, só no local
         </button>
        </div>
       </div>
      )}

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>
     </div>
    )}

    {/* Step 4 - Tipo de Negócio */}
    {step === 4 && (
     <div className="step-business-type flex flex-col gap-4">
      <span className="text-lg font-semibold">Qual é o seu tipo de negócio?</span>
      <span className="text-sm text-gray-500">Selecione a categoria que melhor descreve o que você faz.</span>

      <div className="grid grid-cols-2 gap-3">
       {/* Barbearia */}
       <button
        type="button"
        onClick={() => setBusinessType("barbearia")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "barbearia" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></svg>
        <span className="text-sm font-medium">Barbearia</span>
       </button>

       {/* Salão de Beleza */}
       <button
        type="button"
        onClick={() => setBusinessType("salao")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "salao" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z" /><path d="M12 12v10" /><path d="M8 22h8" /></svg>
        <span className="text-sm font-medium">Salão de Beleza</span>
       </button>

       {/* Clínica Estética */}
       <button
        type="button"
        onClick={() => setBusinessType("clinica-estetica")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "clinica-estetica" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        <span className="text-sm font-medium">Clínica Estética</span>
       </button>

       {/* Manicure / Nail Designer */}
       <button
        type="button"
        onClick={() => setBusinessType("nail")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "nail" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12l8-8" /><circle cx="12" cy="12" r="3" /></svg>
        <span className="text-sm font-medium">Nail Designer</span>
       </button>

       {/* Cabeleireiro */}
       <button
        type="button"
        onClick={() => setBusinessType("cabeleireiro")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "cabeleireiro" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
        <span className="text-sm font-medium">Cabeleireiro(a)</span>
       </button>

       {/* Massoterapia / Spa */}
       <button
        type="button"
        onClick={() => setBusinessType("massoterapia")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "massoterapia" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        <span className="text-sm font-medium">Massoterapia / Spa</span>
       </button>

       {/* Maquiador(a) */}
       <button
        type="button"
        onClick={() => setBusinessType("maquiador")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "maquiador" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813h6.147l-4.985 3.587 1.912 5.813L12 14.626l-4.986 3.587 1.912-5.813-4.985-3.587h6.147z" /></svg>
        <span className="text-sm font-medium">Maquiador(a)</span>
       </button>

       {/* Tatuador */}
       <button
        type="button"
        onClick={() => setBusinessType("tatuador")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "tatuador" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
        <span className="text-sm font-medium">Tatuador(a)</span>
       </button>

       {/* Personal Trainer */}
       <button
        type="button"
        onClick={() => setBusinessType("personal")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "personal" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z" /><path d="M12 6.5v11" /><path d="M6.5 12h11" /></svg>
        <span className="text-sm font-medium">Personal Trainer</span>
       </button>

       {/* Outro */}
       <button
        type="button"
        onClick={() => setBusinessType("outro")}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${businessType === "outro" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
       >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
        <span className="text-sm font-medium">Outro</span>
       </button>
      </div>

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>
     </div>
    )}

    {/* Step 5 - Estilo de Atendimento da IA */}
    {step === 5 && (
     <div className="step-ai-style flex flex-col gap-4">
      <span className="text-lg font-semibold">Como a IA deve atender seus clientes?</span>
      <span className="text-sm text-gray-500">Escolha o estilo que melhor representa como você falaria com seus clientes.</span>

      {/* Opção 1 - Direto ao ponto */}
      <button
       type="button"
       onClick={() => { setAiStyle("direto"); setCustomAiStyle(""); }}
       className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${aiStyle === "direto" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
      >
       <span className="font-semibold">🎯 Direto ao ponto</span>
       <span className="text-sm text-gray-500">Respostas curtas e objetivas, sem enrolação. Vai direto ao que o cliente precisa.</span>
      </button>

      {/* Opção 2 - Amigável e acolhedor */}
      <button
       type="button"
       onClick={() => { setAiStyle("amigavel"); setCustomAiStyle(""); }}
       className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${aiStyle === "amigavel" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
      >
       <span className="font-semibold">😊 Amigável e acolhedor</span>
       <span className="text-sm text-gray-500">Conversa com naturalidade, é simpático e faz o cliente se sentir em casa.</span>
      </button>

      {/* Opção 3 - Personalizado */}
      <button
       type="button"
       onClick={() => setAiStyle("profissional")}
       className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${aiStyle === "profissional" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
      >
       <span className="font-semibold">✍️ Personalizado</span>
       <span className="text-sm text-gray-500">Você descreve como quer que a IA atenda. Escreva no seu estilo!</span>
      </button>

      {/* Campo de texto personalizado */}
      {aiStyle === "profissional" && (
       <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Descreva como você atende seus clientes:</span>
        <textarea
         className="min-h-[100px] rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
         placeholder="Ex: Sempre cumprimento pelo nome, pergunto como foi a semana, ofereço horários flexíveis e confirmo por WhatsApp..."
         value={customAiStyle}
         onChange={(e) => setCustomAiStyle(e.target.value)}
        />
       </div>
      )}

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>
     </div>
    )}

    {/* Step 6 - Confirmação */}
    {step === 6 && (
     <div className="step-confirmation flex flex-col gap-4">
      <span className="text-lg font-semibold">Confirme seus dados</span>
      <span className="text-sm text-gray-500">Verifique se tudo está correto antes de finalizar.</span>

      {/* Dados pessoais */}
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
       <span className="text-xs font-semibold text-gray-400 uppercase">Dados Pessoais</span>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Nome</span>
        <span className="text-sm font-medium">{name}</span>
       </div>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">CPF/CNPJ</span>
        <span className="text-sm font-medium">{cpfCnpj}</span>
       </div>
      </div>

      {/* Endereço */}
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
       <span className="text-xs font-semibold text-gray-400 uppercase">Endereço</span>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">CEP</span>
        <span className="text-sm font-medium">{cep}</span>
       </div>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Rua</span>
        <span className="text-sm font-medium">{street}{addressNumber ? `, ${addressNumber}` : ""}{complement ? ` - ${complement}` : ""}</span>
       </div>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Bairro</span>
        <span className="text-sm font-medium">{neighborhood}</span>
       </div>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Cidade/UF</span>
        <span className="text-sm font-medium">{city}/{state}</span>
       </div>
      </div>

      {/* Tipo de conta */}
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
       <span className="text-xs font-semibold text-gray-400 uppercase">Tipo de Conta</span>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Tipo</span>
        <span className="text-sm font-medium">{accountType === "establishment" ? "Estabelecimento" : "Profissional Individual"}</span>
       </div>
       {accountType === "professional" && (
        <div className="flex justify-between">
         <span className="text-sm text-gray-500">Atendimento domiciliar</span>
         <span className="text-sm font-medium">{homeService ? "Sim" : "Não"}</span>
        </div>
       )}
      </div>

      {/* Tipo de negócio */}
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
       <span className="text-xs font-semibold text-gray-400 uppercase">Tipo de Negócio</span>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Categoria</span>
        <span className="text-sm font-medium">{(() => { const m: Record<string, string> = {"barbearia": "Barbearia", "salao": "Salão de Beleza", "clinica-estetica": "Clínica Estética", "nail": "Nail Designer", "cabeleireiro": "Cabeleireiro(a)", "massoterapia": "Massoterapia / Spa", "maquiador": "Maquiador(a)", "tatuador": "Tatuador(a)", "personal": "Personal Trainer", "outro": "Outro"}; return m[businessType] || businessType; })()}</span>
       </div>
      </div>

      {/* Estilo de atendimento */}
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
       <span className="text-xs font-semibold text-gray-400 uppercase">Estilo de Atendimento da IA</span>
       <div className="flex justify-between">
        <span className="text-sm text-gray-500">Estilo</span>
        <span className="text-sm font-medium">{(() => { const m: Record<string, string> = {"direto": "Direto ao ponto", "amigavel": "Amigável e acolhedor", "profissional": "Personalizado"}; return m[aiStyle] || ""; })()}</span>
       </div>
       {aiStyle === "profissional" && customAiStyle && (
        <div className="flex flex-col gap-1 mt-1">
         <span className="text-sm text-gray-500">Descrição</span>
         <span className="text-sm font-medium rounded bg-gray-50 p-2">{customAiStyle}</span>
        </div>
       )}
      </div>

      {/* Política de privacidade */}
      <label className="flex items-start gap-3 mt-2 cursor-pointer">
       <input
        type="checkbox"
        checked={privacyAccepted}
        onChange={(e) => setPrivacyAccepted(e.target.checked)}
        className="mt-1 h-4 w-4 accent-blue-500"
       />
       <span className="text-sm text-gray-600">
        Li e aceito a <a href="#" className="text-blue-500 underline">Política de Privacidade</a> e os <a href="#" className="text-blue-500 underline">Termos de Uso</a>.
       </span>
      </label>

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button
        type="submit"
        onClick={handleNext}
        disabled={!privacyAccepted}
        className={!privacyAccepted ? "opacity-50 cursor-not-allowed" : ""}>
        Criar conta
       </button>
      </div>
     </div>
    )}


   </form>
  </div>
 );
};

export default SignUp;