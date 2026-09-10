import { useEffect, useRef, useState } from "react";
import {
  FiEye,
  FiEyeOff,
  FiSave,
  FiMapPin,
  FiUser,
  FiBriefcase,
  FiMessageSquare,
  FiClock,
  FiChevronDown,
  FiAlertCircle,
  FiCheck,
  FiNavigation,
  FiLink,
  FiCopy,
  FiMail,
} from "react-icons/fi";
import {
  validatePassword,
  passwordRequirements,
  validateFullName,
  validateCPF,
  validateCNPJ,
  validateDocument,
  formatCEP,
  type ViaCEPResponse,
} from "../../SignUp/passwordValidation";
import Toast from "../../Components/Toast";
import { API_URL } from "@/api/client";

interface AddressState {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

type AccountType = "establishment" | "professional" | "";
type AiStyleType = "direto" | "amigavel" | "profissional" | "";

interface FormState {
  name: string;
  document: string;
  email: string;
  address: AddressState;
  accountType: AccountType;
  homeService: boolean;
  businessType: string;
  aiStyle: AiStyleType;
  customAiStyle: string;
  workStart: string;
  workEnd: string;
  workDays: number[];
  appointmentInterval: number;
  scheduleInterval: number;
  appointmentBuffer: number;
  breakStart: string;
  breakEnd: string;
  homeServiceMaxDistanceKm: string;
}

interface ProfileResponse {
  name: string;
  document: string;
  email?: string | null;
  pendingEmail?: string | null;
  address: AddressState;
  accountType: "establishment" | "professional";
  homeService: boolean;
  businessType: string;
  aiStyle: "direto" | "amigavel" | "profissional";
  customAiStyle?: string;
  workSchedule: {
    name?: string;
    days: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      appointmentInterval: number;
      isActive: boolean;
    }[];
  };
  scheduleInterval?: number;
  appointmentBuffer?: number;
  breakStart?: string | null;
  breakEnd?: string | null;
  publicSlug?: string | null;
  homeServiceMaxDistanceKm?: number | null;
}

const emptyForm: FormState = {
  name: "",
  document: "",
  email: "",
  address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  accountType: "",
  homeService: false,
  businessType: "",
  aiStyle: "",
  customAiStyle: "",
  workStart: "",
  workEnd: "",
  workDays: [1, 2, 3, 4, 5],
  appointmentInterval: 30,
  scheduleInterval: 15,
  appointmentBuffer: 0,
  breakStart: "",
  breakEnd: "",
  homeServiceMaxDistanceKm: "",
};

const inputClass =
  "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 bg-white hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 min-w-0 placeholder:text-gray-300";
const labelClass = "text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide";

const WEEKDAYS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
];

const AI_STYLES: { value: Exclude<AiStyleType, "">; icon: string; title: string; desc: string }[] = [
  { value: "direto", icon: "🎯", title: "Direto", desc: "Respostas objetivas e rápidas" },
  { value: "amigavel", icon: "😊", title: "Amigável", desc: "Natural, simpático e acolhedor" },
  { value: "profissional", icon: "✍️", title: "Personalizado", desc: "Você descreve o tom ideal" },
];

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

type SectionId = "personal" | "password" | "address" | "account" | "ai" | "schedule" | "public";

const SECTIONS: { id: SectionId; icon: typeof FiUser; label: string; subtitle: string }[] = [
  { id: "personal", icon: FiUser, label: "Dados pessoais", subtitle: "Nome, documento e email" },
  { id: "password", icon: FiEye, label: "Senha", subtitle: "Trocar com confirmação por email" },
  { id: "address", icon: FiMapPin, label: "Endereço", subtitle: "Onde você atende" },
  { id: "account", icon: FiBriefcase, label: "Tipo de conta", subtitle: "Estabelecimento ou profissional" },
  { id: "ai", icon: FiMessageSquare, label: "Estilo da IA", subtitle: "Como ela fala com seus clientes" },
  { id: "schedule", icon: FiClock, label: "Horários", subtitle: "Jornada, intervalo da agenda e delay" },
  { id: "public", icon: FiLink, label: "Divulgação", subtitle: "Seu link público de agendamento" },
];

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(["personal"]));
  const [sectionErrors, setSectionErrors] = useState<Set<SectionId>>(new Set());

  const [form, setForm] = useState<FormState>(emptyForm);
  const initialSnapshot = useRef<string>(JSON.stringify(emptyForm));

  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [bookingLinkCopied, setBookingLinkCopied] = useState(false);

  // Troca de senha (fluxo separado, com código enviado por email)
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCode, setPasswordCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requestingPasswordCode, setRequestingPasswordCode] = useState(false);
  const [confirmingPasswordChange, setConfirmingPasswordChange] = useState(false);

  // Troca de email (fluxo separado, com código enviado para o NOVO endereço).
  // O email só muda depois de confirmar o código; enquanto isso o atual vale.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [requestingEmailCode, setRequestingEmailCode] = useState(false);
  const [confirmingEmailChange, setConfirmingEmailChange] = useState(false);

  const [cpfCnpjStatus, setCpfCnpjStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(
    null
  );
  const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [skipCepAutoFill, setSkipCepAutoFill] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success" | "warning" | "info"; message: string }>(
    { show: false, type: "error", message: "" }
  );

  const nameValidation = validateFullName(form.name);
  const passwordChecks = validatePassword(password);
  const isDirty = JSON.stringify(form) !== initialSnapshot.current;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const newEmailValid = EMAIL_REGEX.test(newEmail.trim());
  const documentValidation = validateDocument(form.document);

  const handleRequestPasswordCode = async () => {
    setRequestingPasswordCode(true);
    try {
      const res = await fetch(`${API_URL}/user/password/request-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar código");
      setPasswordCodeSent(true);
      setToast({ show: true, type: "success", message: "Código enviado para o seu email" });
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao enviar código" });
    } finally {
      setRequestingPasswordCode(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (passwordCode.trim().length !== 6) {
      setToast({ show: true, type: "error", message: "Informe o código de 6 dígitos" });
      return;
    }
    const allValid = Object.values(passwordChecks).every(Boolean);
    if (!allValid) {
      setToast({ show: true, type: "error", message: "A nova senha não atende aos requisitos" });
      return;
    }
    if (password !== confirmPassword) {
      setToast({ show: true, type: "error", message: "As senhas não conferem" });
      return;
    }

    setConfirmingPasswordChange(true);
    try {
      const res = await fetch(`${API_URL}/user/password/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ code: passwordCode.trim(), newPassword: password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao alterar senha");
      setToast({ show: true, type: "success", message: "Senha alterada com sucesso!" });
      setPasswordCodeSent(false);
      setPasswordCode("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao alterar senha" });
    } finally {
      setConfirmingPasswordChange(false);
    }
  };

  // -- Troca de email (fluxo com código enviado ao novo endereço) -----------
  const handleRequestEmailCode = async () => {
    if (!newEmailValid) {
      setToast({ show: true, type: "error", message: "Informe um email válido" });
      return;
    }
    setRequestingEmailCode(true);
    try {
      const res = await fetch(`${API_URL}/user/email/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar código");
      setPendingEmail(newEmail.trim().toLowerCase());
      setEmailCodeSent(true);
      setToast({ show: true, type: "success", message: "Código enviado para o novo email" });
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao enviar código" });
    } finally {
      setRequestingEmailCode(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (emailCode.trim().length !== 6) {
      setToast({ show: true, type: "error", message: "Informe o código de 6 dígitos" });
      return;
    }
    setConfirmingEmailChange(true);
    try {
      const res = await fetch(`${API_URL}/user/email/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ code: emailCode.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao alterar email");
      setToast({ show: true, type: "success", message: "Email alterado com sucesso!" });
      resetEmailChange();
      // Recarrega o perfil pra refletir o novo email e realinhar o snapshot.
      fetchProfile();
    } catch (error) {
      setToast({ show: true, type: "error", message: error instanceof Error ? error.message : "Erro ao alterar email" });
    } finally {
      setConfirmingEmailChange(false);
    }
  };

  const resetEmailChange = () => {
    setEmailChangeOpen(false);
    setEmailCodeSent(false);
    setNewEmail("");
    setEmailCode("");
    setPendingEmail(null);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateAddress = <K extends keyof AddressState>(key: K, value: AddressState[K]) =>
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // -- Fetch current profile -------------------------------------------------
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Erro ao carregar dados");
      const data: ProfileResponse = await response.json();

      const next: FormState = {
        name: data.name,
        document: formatDocument(data.document),
        email: data.email || "",
        address: { ...data.address, complement: data.address.complement || "" },
        accountType: data.accountType,
        homeService: data.homeService,
        businessType: data.businessType,
        aiStyle: data.aiStyle,
        customAiStyle: data.customAiStyle || "",
        workStart: data.workSchedule.days[0]?.startTime || "",
        workEnd: data.workSchedule.days[0]?.endTime || "",
        workDays: data.workSchedule.days.map(d => d.dayOfWeek),
        appointmentInterval: data.workSchedule.days[0]?.appointmentInterval || 30,
        scheduleInterval: data.scheduleInterval ?? 15,
        appointmentBuffer: data.appointmentBuffer ?? 0,
        breakStart: data.breakStart || "",
        breakEnd: data.breakEnd || "",
        homeServiceMaxDistanceKm: data.homeServiceMaxDistanceKm != null ? String(data.homeServiceMaxDistanceKm) : "",
      };

      setForm(next);
      setPublicSlug(data.publicSlug ?? null);
      initialSnapshot.current = JSON.stringify(next);

      // Retoma uma troca de email que ficou pendente (código já enviado antes).
      if (data.pendingEmail) {
        setPendingEmail(data.pendingEmail);
        setNewEmail(data.pendingEmail);
        setEmailChangeOpen(true);
        setEmailCodeSent(true);
      } else {
        setPendingEmail(null);
      }
    } catch {
      setToast({ show: true, type: "error", message: "Erro ao carregar dados" });
    } finally {
      setIsLoading(false);
    }
  };

  // -- Geolocation -------------------------------------------------------------
  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1&accept-language=pt-BR`
          );
          const data = await res.json();
          const addr = data.address || {};
          const rawCep = (addr.postcode || "").replace(/\D/g, "");
          setSkipCepAutoFill(true);
          setForm((prev) => ({
            ...prev,
            address: {
              ...prev.address,
              cep: rawCep.length === 8 ? formatCEP(rawCep) : addr.postcode || "",
              street: addr.road || addr.street || "",
              neighborhood: addr.suburb || addr.neighbourhood || "",
              city: addr.city || addr.town || "",
              state: addr.state || "",
            },
          }));
          setCepStatus({ type: "success", message: "Localização encontrada!" });
        } catch {
          setCepStatus({ type: "error", message: "Erro ao buscar localização" });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setCepStatus({ type: "error", message: "Permissão negada" });
      }
    );
  };

  // -- CEP autofill --------------------------------------------------------
  useEffect(() => {
    if (skipCepAutoFill) {
      setSkipCepAutoFill(false);
      return;
    }
    const numbers = form.address.cep.replace(/\D/g, "");
    if (numbers.length !== 8) {
      setCepStatus(numbers.length > 0 ? { type: "error", message: "CEP inválido" } : null);
      return;
    }
    setCepStatus({ type: "loading", message: "Buscando..." });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
        const data: ViaCEPResponse & { erro?: boolean } = await res.json();
        if (data.erro) {
          setCepStatus({ type: "error", message: "CEP não encontrado" });
          return;
        }
        setForm((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          },
        }));
        setCepStatus({ type: "success", message: "Endereço encontrado!" });
      } catch {
        setCepStatus({ type: "error", message: "Erro ao buscar CEP" });
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address.cep, skipCepAutoFill]);

  // -- CPF/CNPJ validation --------------------------------------------------
  // Enquanto o documento está incompleto o status fica neutro (não acende erro
  // vermelho a cada dígito). Só CPF/CNPJ completo é validado de fato; a consulta
  // externa de CNPJ é só enriquecimento — se falhar/offline, o documento com
  // dígito verificador correto continua válido.
  useEffect(() => {
    const numbers = form.document.replace(/\D/g, "");
    if (!numbers) {
      setCpfCnpjStatus(null);
      return;
    }
    if (numbers.length < 11 || (numbers.length > 11 && numbers.length < 14)) {
      setCpfCnpjStatus({ type: "loading", message: "Digite o CPF ou CNPJ completo" });
      return;
    }
    if (numbers.length === 11) {
      const result = validateCPF(numbers);
      setCpfCnpjStatus({ type: result.valid ? "success" : "error", message: result.message });
      return;
    }
    // 14 dígitos
    const cnpjCheck = validateCNPJ(numbers);
    if (!cnpjCheck.valid) {
      setCpfCnpjStatus({ type: "error", message: cnpjCheck.message });
      return;
    }
    setCpfCnpjStatus({ type: "loading", message: "Consultando CNPJ..." });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numbers}`);
        if (!res.ok) {
          setCpfCnpjStatus({ type: "success", message: "CNPJ válido" });
          return;
        }
        const data = await res.json();
        setCpfCnpjStatus({ type: "success", message: `CNPJ: ${data.razao_social || "válido"}` });
      } catch {
        setCpfCnpjStatus({ type: "success", message: "CNPJ válido" });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form.document]);

  // Se o usuário sair do campo de documento com um valor inválido/incompleto,
  // volta para o último documento salvo — o dado nunca fica vazio/inválido.
  const handleDocumentBlur = () => {
    if (!validateDocument(form.document).valid) {
      const prev = (JSON.parse(initialSnapshot.current) as FormState).document;
      update("document", prev);
    }
  };

  // -- Validation ------------------------------------------------------------
  const validate = (): { section: SectionId; message: string }[] => {
    const errors: { section: SectionId; message: string }[] = [];

    if (!nameValidation.valid) errors.push({ section: "personal", message: nameValidation.message });
    if (!documentValidation.valid)
      errors.push({ section: "personal", message: "Informe um CPF ou CNPJ válido" });
    if (!form.email)
      errors.push({ section: "personal", message: "Adicione um email à sua conta antes de salvar" });

    const { cep, street, number, neighborhood, city, state } = form.address;
    if (!cep || !street || !number || !neighborhood || !city || !state)
      errors.push({ section: "address", message: "Preencha todo o endereço" });

    if (!form.accountType) errors.push({ section: "account", message: "Selecione o tipo de conta" });
    if (!form.businessType.trim()) errors.push({ section: "account", message: "Informe o ramo do negócio" });

    if (!form.aiStyle) errors.push({ section: "ai", message: "Selecione um estilo de IA" });
    if (form.aiStyle === "profissional" && !form.customAiStyle.trim())
      errors.push({ section: "ai", message: "Descreva o tom desejado para a IA" });

    if (!form.workStart || !form.workEnd) errors.push({ section: "schedule", message: "Informe o horário de trabalho" });
    if (form.workStart && form.workEnd && form.workStart >= form.workEnd)
      errors.push({ section: "schedule", message: "O horário de início deve ser antes do fim" });
    if (form.workDays.length === 0) errors.push({ section: "schedule", message: "Selecione ao menos um dia" });
    if (!form.scheduleInterval || form.scheduleInterval <= 0) errors.push({ section: "schedule", message: "Informe o intervalo da agenda" });
    if (!!form.breakStart !== !!form.breakEnd) errors.push({ section: "schedule", message: "Informe o início e o fim da pausa" });
    if (form.breakStart && form.breakEnd && form.breakStart >= form.breakEnd)
      errors.push({ section: "schedule", message: "O início da pausa deve ser antes do fim" });

    return errors;
  };

  // -- Save (single endpoint) -------------------------------------------------
  const handleSave = async () => {
    const errors = validate();
    if (errors.length > 0) {
      setSectionErrors(new Set(errors.map((e) => e.section)));
      setOpenSections((prev) => new Set([...prev, errors[0].section]));
      setToast({ show: true, type: "error", message: errors[0].message });
      return;
    }
    setSectionErrors(new Set());

    setIsSaving(true);
    setToast({ show: false, type: "error", message: "" });

    // email não vai no payload: a troca passa pelo fluxo com código de verificação
    const payload: Record<string, unknown> = {
      name: form.name,
      document: form.document.replace(/\D/g, ""),
      address: {
        cep: form.address.cep.replace(/\D/g, ""),
        street: form.address.street,
        number: form.address.number,
        complement: form.address.complement || undefined,
        neighborhood: form.address.neighborhood,
        city: form.address.city,
        state: form.address.state,
      },
      accountType: form.accountType,
      homeService: form.homeService,
      businessType: form.businessType,
      aiStyle: form.aiStyle,
      customAiStyle: form.customAiStyle || undefined,
      workSchedule: {
        name: "Jornada Padrão",
        days: form.workDays.map(day => ({
          dayOfWeek: day,
          startTime: form.workStart,
          endTime: form.workEnd,
          appointmentInterval: form.scheduleInterval,
          isActive: true,
        })),
      },
      scheduleInterval: form.scheduleInterval,
      appointmentBuffer: form.appointmentBuffer,
      breakStart: form.breakStart || null,
      breakEnd: form.breakEnd || null,
      homeServiceMaxDistanceKm: form.homeService && form.homeServiceMaxDistanceKm ? form.homeServiceMaxDistanceKm : undefined,
    };

    try {
      const res = await fetch(`${API_URL}/user/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      initialSnapshot.current = JSON.stringify(form);
      setPassword("");
      setConfirmPassword("");
      setToast({ show: true, type: "success", message: "Configurações salvas com sucesso!" });
    } catch {
      setToast({ show: true, type: "error", message: "Erro ao salvar. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePublicLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await fetch(`${API_URL}/user/public-link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Erro ao gerar link");
      const data = await res.json();
      setPublicSlug(data.publicSlug);
      setToast({ show: true, type: "success", message: "Link de divulgação gerado!" });
    } catch {
      setToast({ show: true, type: "error", message: "Erro ao gerar link de divulgação" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const publicUrl = publicSlug ? `${window.location.origin}/p/${publicSlug}` : null;
  const bookingUrl = publicSlug ? `${window.location.origin}/p/${publicSlug}/agendar` : null;

  const handleCopyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setToast({ show: true, type: "error", message: "Não foi possível copiar o link" });
    }
  };

  const handleCopyBookingLink = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setBookingLinkCopied(true);
      setTimeout(() => setBookingLinkCopied(false), 2500);
    } catch {
      setToast({ show: true, type: "error", message: "Não foi possível copiar o link" });
    }
  };

  if (isLoading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans pb-28 h-full overflow-y-auto scrollbar-hidden">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: "error", message: "" })}
      />

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Configurações</h1>
        <p className="text-sm text-gray-400">
          Gerencie seus dados, endereço, horários e preferências da IA
        </p>
      </div>

      {/* Seções */}
      <div className="space-y-4">
        {SECTIONS.map(({ id, icon: Icon, label, subtitle }) => {
          const isOpen = openSections.has(id);
          const hasError = sectionErrors.has(id);
          const hasContent = (() => {
            switch (id) {
              case "personal": return form.name || form.document;
              case "password": return password.length > 0;
              case "address": return form.address.cep || form.address.street;
              case "account": return form.accountType || form.businessType;
              case "ai": return form.aiStyle;
              case "schedule": return form.workStart || form.workEnd;
              case "public": return Boolean(publicSlug);
              default: return false;
            }
          })();

          return (
            <div
              key={id}
              className={`bg-white rounded-lg border transition-all duration-200 hover:border-gray-400 hover:shadow-sm ${
                hasError ? "border-red-300" : isOpen ? "border-gray-300" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    hasError
                      ? "bg-red-100 text-red-500"
                      : isOpen
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{label}</span>
                    {hasError && (
                      <FiAlertCircle className="text-red-500 flex-shrink-0" size={14} />
                    )}
                    {hasContent && !isOpen && !hasError && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    )}
                  </div>
                  <span className="block text-xs text-gray-400 mt-0.5 truncate">{subtitle}</span>
                </div>
                
                <FiChevronDown
                  className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  size={18}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-100">
                  {id === "personal" && (
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className={labelClass}>Nome completo</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="Seu nome completo"
                          className={inputClass}
                        />
                        {form.name && !nameValidation.valid && (
                          <p className="text-xs text-red-500 mt-1.5 ml-0.5 flex items-center gap-1">
                            <FiAlertCircle size={12} />
                            {nameValidation.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>CPF / CNPJ</label>
                        <input
                          type="text"
                          value={form.document}
                          onChange={(e) => update("document", formatDocument(e.target.value))}
                          onBlur={handleDocumentBlur}
                          placeholder="000.000.000-00"
                          className={inputClass}
                          inputMode="numeric"
                          maxLength={18}
                        />
                        {cpfCnpjStatus && (
                          <p
                            className={`text-xs mt-1.5 ml-0.5 flex items-center gap-1 ${
                              cpfCnpjStatus.type === "success"
                                ? "text-green-600"
                                : cpfCnpjStatus.type === "loading"
                                ? "text-gray-400"
                                : "text-red-500"
                            }`}
                          >
                            {cpfCnpjStatus.type === "success" && <FiCheck size={12} />}
                            {cpfCnpjStatus.type === "loading" && (
                              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            {cpfCnpjStatus.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>

                        {/* Email atual (somente leitura) — trocar exige código no novo endereço */}
                        <div className="flex items-center gap-2">
                          <div className={`${inputClass} flex items-center gap-2 bg-gray-50 text-gray-700 cursor-not-allowed`}>
                            <FiMail size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{form.email || "Nenhum email cadastrado"}</span>
                          </div>
                          {!emailChangeOpen && (
                            <button
                              type="button"
                              onClick={() => { setEmailChangeOpen(true); setNewEmail(""); setEmailCode(""); setEmailCodeSent(false); }}
                              className="flex-shrink-0 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                            >
                              {form.email ? "Alterar" : "Adicionar"}
                            </button>
                          )}
                        </div>

                        {!form.email && !emailChangeOpen && (
                          <p className="text-xs text-red-500 mt-1.5 ml-0.5 flex items-center gap-1">
                            <FiAlertCircle size={12} />
                            Sua conta precisa de um email para login e recuperação de senha.
                          </p>
                        )}

                        {!emailChangeOpen && (
                          <p className="text-xs text-gray-400 mt-1.5 ml-0.5">
                            Usado para login (código de verificação), recuperação e troca de senha.
                          </p>
                        )}

                        {emailChangeOpen && (
                          <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-4">
                            {!emailCodeSent ? (
                              <>
                                <div>
                                  <label className={labelClass}>Novo email</label>
                                  <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="novo@email.com"
                                    className={inputClass}
                                    autoComplete="email"
                                  />
                                  {newEmail && !newEmailValid && (
                                    <p className="text-xs text-red-500 mt-1.5 ml-0.5 flex items-center gap-1">
                                      <FiAlertCircle size={12} />
                                      Informe um email válido
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1.5 ml-0.5">
                                    Enviaremos um código para este endereço. O email atual só muda depois que você confirmar.
                                  </p>
                                </div>
                                <div className="flex gap-2.5">
                                  <button
                                    type="button"
                                    onClick={resetEmailChange}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRequestEmailCode}
                                    disabled={requestingEmailCode || !newEmailValid}
                                    className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                                  >
                                    {requestingEmailCode ? "Enviando..." : "Enviar código"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-500">
                                  Enviamos um código para <strong className="text-gray-700">{pendingEmail || newEmail}</strong>. O código expira em 10 minutos.
                                </p>
                                <div>
                                  <label className={labelClass}>Código recebido por email</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={emailCode}
                                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    className={`${inputClass} text-center tracking-[6px] text-lg`}
                                  />
                                </div>
                                <div className="flex gap-2.5">
                                  <button
                                    type="button"
                                    onClick={resetEmailChange}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleConfirmEmailChange}
                                    disabled={confirmingEmailChange || emailCode.length !== 6}
                                    className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                                  >
                                    {confirmingEmailChange ? "Confirmando..." : "Confirmar novo email"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRequestEmailCode}
                                    disabled={requestingEmailCode}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all disabled:opacity-50"
                                  >
                                    Reenviar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {id === "password" && (
                    <div className="space-y-4 pt-4">
                      {!passwordCodeSent ? (
                        <>
                          <p className="text-sm text-gray-500">
                            Por segurança, para trocar sua senha enviamos um código de confirmação para o seu email cadastrado.
                          </p>
                          <button
                            type="button"
                            onClick={handleRequestPasswordCode}
                            disabled={requestingPasswordCode}
                            className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                          >
                            {requestingPasswordCode ? "Enviando..." : "Enviar código de confirmação"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className={labelClass}>Código recebido por email</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={passwordCode}
                              onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className={`${inputClass} text-center tracking-[6px] text-lg`}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Nova senha</label>
                            <div className="flex gap-2">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nova senha"
                                className={inputClass}
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="flex-shrink-0 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                              </button>
                            </div>
                          </div>
                          {password && (
                            <>
                              <div>
                                <label className={labelClass}>Confirmar senha</label>
                                <input
                                  type={showPassword ? "text" : "password"}
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repita a senha"
                                  className={inputClass}
                                  autoComplete="new-password"
                                />
                                {confirmPassword && password !== confirmPassword && (
                                  <p className="text-xs text-red-500 mt-1.5 ml-0.5 flex items-center gap-1">
                                    <FiAlertCircle size={12} />
                                    As senhas não conferem
                                  </p>
                                )}
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                {passwordRequirements.map((req) => (
                                  <p
                                    key={req.key}
                                    className={`text-xs flex items-center gap-2 ${
                                      passwordChecks[req.key] ? "text-green-600" : "text-gray-400"
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                        passwordChecks[req.key]
                                          ? "bg-green-100 text-green-600"
                                          : "bg-gray-200 text-gray-400"
                                      }`}
                                    >
                                      {passwordChecks[req.key] ? "✓" : ""}
                                    </span>
                                    {req.label}
                                  </p>
                                ))}
                              </div>
                            </>
                          )}
                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => { setPasswordCodeSent(false); setPasswordCode(""); setPassword(""); setConfirmPassword(""); }}
                              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmPasswordChange}
                              disabled={confirmingPasswordChange}
                              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                              {confirmingPasswordChange ? "Confirmando..." : "Confirmar nova senha"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {id === "address" && (
                    <div className="space-y-4 pt-4">
                      <button
                        type="button"
                        onClick={handleUseLocation}
                        disabled={locationLoading}
                        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors group"
                      >
                        <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all">
                          <FiNavigation size={13} />
                        </span>
                        {locationLoading ? "Localizando..." : "Usar localização atual"}
                      </button>

                      <div>
                        <label className={labelClass}>CEP</label>
                        <input
                          type="text"
                          value={form.address.cep}
                          onChange={(e) => updateAddress("cep", formatCEP(e.target.value))}
                          maxLength={9}
                          placeholder="00000-000"
                          className={inputClass}
                          inputMode="numeric"
                        />
                        {cepStatus && (
                          <p
                            className={`text-xs mt-1.5 ml-0.5 flex items-center gap-1 ${
                              cepStatus.type === "success"
                                ? "text-green-600"
                                : cepStatus.type === "loading"
                                ? "text-gray-400"
                                : "text-red-500"
                            }`}
                          >
                            {cepStatus.type === "success" && <FiCheck size={12} />}
                            {cepStatus.type === "loading" && (
                              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            {cepStatus.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Rua</label>
                        <input
                          type="text"
                          value={form.address.street}
                          onChange={(e) => updateAddress("street", e.target.value)}
                          placeholder="Nome da rua"
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Número</label>
                          <input
                            type="text"
                            value={form.address.number}
                            onChange={(e) => updateAddress("number", e.target.value)}
                            placeholder="Nº"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Complemento</label>
                          <input
                            type="text"
                            value={form.address.complement}
                            onChange={(e) => updateAddress("complement", e.target.value)}
                            placeholder="Apto, bloco..."
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Bairro</label>
                        <input
                          type="text"
                          value={form.address.neighborhood}
                          onChange={(e) => updateAddress("neighborhood", e.target.value)}
                          placeholder="Nome do bairro"
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-[1fr_72px] gap-3">
                        <div>
                          <label className={labelClass}>Cidade</label>
                          <input
                            type="text"
                            value={form.address.city}
                            onChange={(e) => updateAddress("city", e.target.value)}
                            placeholder="Cidade"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>UF</label>
                          <input
                            type="text"
                            value={form.address.state}
                            onChange={(e) => updateAddress("state", e.target.value.toUpperCase().slice(0, 2))}
                            maxLength={2}
                            placeholder="UF"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {id === "account" && (
                    <div className="space-y-5 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["establishment", "professional"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              update("accountType", type);
                              if (type === "professional") update("homeService", true);
                              if (type === "establishment") update("homeService", false);
                            }}
                            className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                              form.accountType === type
                                ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900/5"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  form.accountType === type
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {type === "establishment" ? (
                                  <FiBriefcase size={15} />
                                ) : (
                                  <FiUser size={15} />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {type === "establishment" ? "Estabelecimento" : "Profissional"}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {type === "establishment" ? "Salão, clínica, estúdio" : "Autônomo, freelancer"}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className={labelClass}>Ramo do negócio</label>
                        <input
                          type="text"
                          value={form.businessType}
                          onChange={(e) => update("businessType", e.target.value)}
                          placeholder="Ex: Salão de beleza, barbearia..."
                          className={inputClass}
                        />
                      </div>
                      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={form.homeService}
                            onChange={(e) => update("homeService", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-gray-900 transition-colors duration-200"></div>
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform duration-200"></div>
                        </div>
                        Atende também a domicílio
                      </label>

                      {form.homeService && (
                        <div className="space-y-4 pt-2 pl-1 border-l-2 border-gray-100 ml-1">
                          <p className="text-xs text-gray-400 pl-3">
                            O custo de deslocamento (ida e volta) é calculado automaticamente pela
                            distância real da rota até o cliente, com uma taxa fixa por km — você só
                            escolhe até onde atende.
                          </p>

                          <div className="pl-3">
                            <label className={labelClass}>Zona de atendimento</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {[5, 10, 15, 20, 30, 50].map((km) => (
                                <button
                                  key={km}
                                  type="button"
                                  onClick={() => update("homeServiceMaxDistanceKm", String(km))}
                                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                                    form.homeServiceMaxDistanceKm === String(km)
                                      ? "bg-gray-900 text-white border-gray-900"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  {km} km
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-300 mt-1.5 ml-0.5">
                              Agendamentos a domicílio fora desse raio são recusados automaticamente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {id === "ai" && (
                    <div className="space-y-3 pt-4">
                      {AI_STYLES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            update("aiStyle", item.value);
                            if (item.value !== "profissional") update("customAiStyle", "");
                          }}
                          className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200 ${
                            form.aiStyle === item.value
                              ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900/5"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                              form.aiStyle === item.value
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                            <span className="block text-xs text-gray-400 mt-0.5">{item.desc}</span>
                          </div>
                          {form.aiStyle === item.value && (
                            <FiCheck className="ml-auto text-gray-900 flex-shrink-0" size={16} />
                          )}
                        </button>
                      ))}
                      {form.aiStyle === "profissional" && (
                        <textarea
                          value={form.customAiStyle}
                          onChange={(e) => update("customAiStyle", e.target.value)}
                          placeholder="Ex: Seja educado e formal, mas com um toque acolhedor..."
                          className={`${inputClass} min-h-[100px] resize-none`}
                        />
                      )}
                    </div>
                  )}

                  {id === "schedule" && (
                    <div className="space-y-4 pt-4">
                      {/* Grupo 1: jornada — quando o profissional trabalha */}
                      <div className="bg-gray-50/70 rounded-xl p-4 space-y-4">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Jornada</p>

                        <div>
                          <label className={labelClass}>Horário de trabalho</label>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                            <input
                              type="time"
                              value={form.workStart}
                              onChange={(e) => update("workStart", e.target.value)}
                              className={inputClass}
                            />
                            <span className="text-xs text-gray-300 font-medium">até</span>
                            <input
                              type="time"
                              value={form.workEnd}
                              onChange={(e) => update("workEnd", e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          {form.workStart && form.workEnd && form.workStart >= form.workEnd && (
                            <p className="text-xs text-red-500 mt-1.5 ml-0.5 flex items-center gap-1">
                              <FiAlertCircle size={12} />
                              O início deve ser antes do fim
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>Dias da semana</label>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((d) => {
                              const active = form.workDays.includes(d.v);
                              return (
                                <button
                                  type="button"
                                  key={d.v}
                                  onClick={() =>
                                    update(
                                      "workDays",
                                      active
                                        ? form.workDays.filter((x) => x !== d.v)
                                        : [...form.workDays, d.v]
                                    )
                                  }
                                  className={`flex-1 min-w-[46px] py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                    active
                                      ? "bg-gray-900 text-white shadow-sm"
                                      : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                                  }`}
                                >
                                  {d.l}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Pausa fixa (opcional)</label>
                          <p className="text-xs text-gray-400 mb-2">
                            Bloqueia esse horário todo dia de trabalho, tipo o almoço.
                          </p>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                            <input
                              type="time"
                              value={form.breakStart}
                              onChange={(e) => update("breakStart", e.target.value)}
                              className={inputClass}
                            />
                            <span className="text-xs text-gray-300 font-medium">até</span>
                            <input
                              type="time"
                              value={form.breakEnd}
                              onChange={(e) => update("breakEnd", e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          {(form.breakStart || form.breakEnd) && (
                            <button
                              type="button"
                              onClick={() => {
                                update("breakStart", "");
                                update("breakEnd", "");
                              }}
                              className="mt-2 text-xs font-semibold text-gray-400 hover:text-gray-600"
                            >
                              Remover pausa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Grupo 2: agenda — descanso entre atendimentos (o intervalo virou só a régua interna
                          dos horários oferecidos, não é mais algo que o usuário precisa configurar) */}
                      <div className="bg-gray-50/70 rounded-xl p-4 space-y-4">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Agenda</p>

                        <div>
                          <label className={labelClass}>Delay entre atendimentos</label>
                          <p className="text-xs text-gray-400 mb-2">
                            Descanso após cada atendimento, antes do próximo poder começar.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[0, 5, 10, 15, 20, 30].map((min) => {
                              const active = form.appointmentBuffer === min;
                              return (
                                <button
                                  key={min}
                                  type="button"
                                  onClick={() => update("appointmentBuffer", min)}
                                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                    active
                                      ? "bg-gray-900 text-white shadow-sm"
                                      : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                                  }`}
                                >
                                  {min === 0 ? "Sem delay" : `${min} min`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {id === "public" && (
                    <div className="space-y-4 pt-4">
                      <p className="text-xs text-gray-400">
                        Você tem dois links pra divulgar — ideal pra colocar na bio do Instagram
                        ou enviar no WhatsApp. Escolha o que fizer mais sentido pro seu público,
                        ou use os dois.
                      </p>

                      {publicUrl && bookingUrl ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
                              Chat com a IA — o cliente conversa e é atendido pela assistente
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="flex-1 min-w-0 truncate text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700">
                                {publicUrl}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyPublicLink}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                              >
                                {linkCopied ? <FiCheck size={13} className="text-green-600" /> : <FiCopy size={13} />}
                                {linkCopied ? "Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
                              Agendamento direto — o cliente escolhe serviço e horário pelos botões
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="flex-1 min-w-0 truncate text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700">
                                {bookingUrl}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopyBookingLink}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                              >
                                {bookingLinkCopied ? <FiCheck size={13} className="text-green-600" /> : <FiCopy size={13} />}
                                {bookingLinkCopied ? "Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGeneratePublicLink}
                          disabled={generatingLink}
                          className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-all duration-200 disabled:opacity-40"
                        >
                          {generatingLink ? (
                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <FiLink size={13} />
                          )}
                          Gerar Links de Divulgação
                        </button>
                      )}

                      <p className="text-[11px] text-gray-300">
                        O link é único (mesmo identificador pros dois) e não muda depois de gerado.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* O aceite de Termos de Uso / Política de Privacidade é feito no cadastro
          e não é reexibido aqui. */}

      {/* Sticky save bar */}
      <div
        className="mt-6 bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-4 py-10 flex items-center justify-end gap-10">
          <span className="text-xs text-gray-400 flex items-center gap-2">
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
            )}
            {isDirty ? "Alterações não salvas" : "Tudo salvo"}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 tracking-wide"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiSave size={15} />
            )}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;