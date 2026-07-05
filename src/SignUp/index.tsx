import { useEffect, useState, type CSSProperties } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { validatePassword, isAllValid, isPasswordMatch, passwordRequirements, validateFullName, validateCPF } from "./passwordValidation";

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
 const [number, setNumber] = useState("");
 const [complement, setComplement] = useState("");
 const [neighborhood, setNeighborhood] = useState("");
 const [city, setCity] = useState("");
 const [state, setState] = useState("");
 const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

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
   if (!cep.trim()) return;
   if (!street.trim()) return;
   if (!number.trim()) return;
   if (!neighborhood.trim()) return;
   if (!city.trim()) return;
   if (!state.trim()) return;
  }

  if (step === 3) return;
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

 // Formatar CEP (XXXXX-XXX)
 const formatCep = (value: string) => {
  const nums = value.replace(/\D/g, "").slice(0, 8);
  if (nums.length > 5) {
   return nums.slice(0, 5) + "-" + nums.slice(5);
  }
  return nums;
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

 // Buscar endereço pelo CEP (Brasil API)
 useEffect(() => {
  const numbers = cep.replace(/\D/g, "");

  if (numbers.length < 8) {
   if (numbers.length > 0) {
    setCepStatus({ type: "error", message: "CEP incompleto." });
   } else {
    setCepStatus(null);
   }
   return;
  }

  setCepStatus({ type: "loading", message: "Buscando endereço..." });

  const timer = setTimeout(async () => {
   try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${numbers}`);

    if (!response.ok) {
     setCepStatus({ type: "error", message: "CEP não encontrado." });
     return;
    }

    const data = await response.json();
    setStreet(data.street || "");
    setNeighborhood(data.neighborhood || "");
    setCity(data.city || "");
    setState(data.state || "");
    setCepStatus({ type: "success", message: "Endereço encontrado." });
   } catch {
    setCepStatus({ type: "error", message: "Erro ao buscar CEP." });
   }
  }, 1000);

  return () => clearTimeout(timer);
 }, [cep]);



 return (
  // Aqui estamos centralizando o form
  <div style={style.windowsignup}>
   <form action="" method="post" className="border p-4">

    {/* Aqui é cada Step  */}
    {/* Step 1 */}
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
     <div className="step-info-user flex flex-col gap-4">
      <span>Endereço</span>

      <input
       type="text"
       placeholder="CEP"
       value={cep}
       onChange={(e) => setCep(formatCep(e.target.value))}
       maxLength={9}
      />
      {cepStatus && (
       <span className={`text-xs ${cepStatus.type === "success" ? "text-green-500" : cepStatus.type === "loading" ? "text-yellow-500" : "text-red-500"}`}>
        {cepStatus.type === "loading" ? "⏳" : cepStatus.type === "success" ? "✓" : "✗"} {cepStatus.message}
       </span>
      )}

      <input
       type="text"
       placeholder="Rua"
       value={street}
       onChange={(e) => setStreet(e.target.value)}
      />

      <div className="flex gap-2">
       <input
        type="text"
        placeholder="Número"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        className="w-1/3"
       />
       <input
        type="text"
        placeholder="Complemento"
        value={complement}
        onChange={(e) => setComplement(e.target.value)}
        className="flex-1"
       />
      </div>

      <input
       type="text"
       placeholder="Bairro"
       value={neighborhood}
       onChange={(e) => setNeighborhood(e.target.value)}
      />

      <div className="flex gap-2">
       <input
        type="text"
        placeholder="Cidade"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="flex-1"
       />
       <input
        type="text"
        placeholder="Estado"
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="w-1/4"
       />
      </div>

      <div className="flex justify-between mt-5">
       <button type="button" onClick={handlePrev}>Voltar</button>
       <button type="button" onClick={handleNext}>Próximo</button>
      </div>
     </div>
    )}

    {/* Step 3 */}
    {step === 3 && (
     <div className="step-info-user flex flex-col gap-4">
      <span>Mudou 3</span>
      <input type="text" placeholder="Nome" />
      <input type="text" placeholder="Nome" />
      <input type="text" placeholder="Nome" />
     </div>
    )}


    {/* <div className="flex justify-between mt-5">
     <button type="button" onClick={handlePrev}>Voltar</button>
     <button type="button" onClick={handleNext}>Próximo</button>
    </div> */}

   </form>
  </div>
 );
};

export default SignUp;