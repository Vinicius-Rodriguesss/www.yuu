import { Fragment, useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiCheck, FiDollarSign, FiX, FiPlus, FiSlash, FiLock, FiHome } from "react-icons/fi";
import { apiFetch, tzOffsetMin } from "@/api/client";
import { formatCEP, formatPhone, type ViaCEPResponse } from "@/SignUp/passwordValidation";
import Toast from "@/Components/Toast";
import "./index.css";

// Mesmo formato de cliente/serviço usado no calendário antigo (dados já cadastrados no backend)
interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Service {
  id: number;
  title: string;
  duration: number;
  price: string;
}

// Endereço do cliente, usado quando o atendimento é a domicílio
interface CustomerAddress {
  id: number;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
}

const emptyAddress = { cep: "", street: "", number: "", neighborhood: "", city: "", state: "" };

// Agendamento real, vindo do backend (GET /appointments) — já existe e funciona, só faltava desenhar isso na grade
interface Appointment {
  id: number;
  customerId: number;
  serviceId: number;
  scheduledAt: string;
  duration: number;
  price: string;
  status: string;
  notes: string | null;
  isHomeService?: boolean;
  customerAddressId?: number | null;
  travelMinutes?: number;
  travelDistanceKm?: string | number;
  travelCost?: string | number;
}

// Bloqueio manual de horário (folga, almoço, indisponibilidade), vindo do backend (GET /blocked-slots)
interface BlockedSlot {
  id: number;
  type: string;
  title: string;
  startAt: string;
  endAt: string;
}

// Cor de fundo de cada bloco na grade, por status do agendamento
const statusColors: Record<string, string> = {
  scheduled: "#f0803c",
  confirmed: "#2fb350",
  in_progress: "#d97706",
  completed: "#767676",
  cancelled: "#e0263f",
  no_show: "#e0263f",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Finalizado",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

// Dias da semana exibidos no cabeçalho do mini-calendário (semana começando na segunda)
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const monthNamesFull = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Chave yyyy-mm-dd usada para comparar datas (dia de hoje, dia selecionado, dias da grade)
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const hours: number[] = [];
for (let i = 0; i < 24; i++) {
  hours.push(i);
}

// Iniciais do cliente pro avatar do seletor visual (ex: "Vinicius Rodrigues" → "VR")
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";



const Calendar = () => {
  // Toast de erro/sucesso — usado no lugar de alert() pra feedback de ações (arrastar agendamento, excluir bloqueio, etc)
  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success" | "warning" | "info"; message: string }>(
    { show: false, type: "error", message: "" }
  );
  const showError = (message: string) => setToast({ show: true, type: "error", message });

  // Controla se o painel "Destacar Agendamentos" está expandido ou recolhido
  const [highlightOpen, setHighlightOpen] = useState(true);

  // Controla se o mini-calendário (nav-calendar) aparece como dropdown — escondido por padrão, abre
  // ao clicar na data do cabeçalho
  const [isNavCalendarOpen, setIsNavCalendarOpen] = useState(false);

  // Estado dos filtros de pagamento (Pago / Não pago)
  const [paidFilter, setPaidFilter] = useState(false);
  const [unpaidFilter, setUnpaidFilter] = useState(false);

  // Estado do filtro de status da reserva (Confirmada / Não confirmada)
  const [confirmedFilter, setConfirmedFilter] = useState(false);
  const [unconfirmedFilter, setUnconfirmedFilter] = useState(false);

  // Estado do filtro de local do atendimento (a domicílio) — destaca na agenda e esmaece o restante
  const [homeServiceFilter, setHomeServiceFilter] = useState(false);

  // Reseta todos os filtros do painel
  const handleClearFilters = () => {
    setPaidFilter(false);
    setUnpaidFilter(false);
    setConfirmedFilter(false);
    setUnconfirmedFilter(false);
    setHomeServiceFilter(false);
  };

  // Referência de cada linha de hora, usada para calcular a posição real (em px) do horário atual
  const hourRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Referência da área com scroll do calendário, para centralizar o scroll no horário atual ao carregar
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToNowRef = useRef(false);

  // Posição (topo, em px) e texto (HH:mm) da linha que indica o horário atual
  const [nowTop, setNowTop] = useState<number | null>(null);
  const [nowLabel, setNowLabel] = useState("");

  // Jornada de trabalho real do dia selecionado (definida pelo usuário no cadastro), não mais fixa.
  // Declarado aqui (antes do efeito que recalcula a linha do "agora") porque ele muda a altura das
  // linhas de hora e precisa disparar um recálculo de posição.
  const [workHours, setWorkHours] = useState<{ isWorkDay: boolean; workStart: string | null; workEnd: string | null; interval: number; buffer: number; breakStart: string | null; breakEnd: string | null } | null>(null);

  // Passo (em minutos) usado pra linhas de minuto, encaixe do arrastar e step do campo de hora — o
  // Delay entre atendimentos é o único que controla espaçamento na agenda (o Intervalo virou config
  // interna, não editável mais pela tela de Configurações). Sem delay configurado, cai num padrão de
  // 15 min só pra grade não ficar sem nenhum encaixe.
  const stepMinutes = workHours?.buffer && workHours.buffer > 0 ? workHours.buffer : 15;

  useEffect(() => {
    // Calcula a posição da linha com base na altura real da linha da hora atual + fração dos minutos já passados.
    // Usa o fuso de Brasília explicitamente (em vez de now.getHours()/getMinutes(), que dependem do fuso do
    // sistema/navegador) — numa máquina com relógio em UTC isso causava uma linha 3h adiantada/atrasada.
    const updateNowLine = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        hourCycle: "h23",
        hour: "numeric",
        minute: "numeric",
      }).formatToParts(new Date());
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      const row = hourRowRefs.current[hour];

      if (row) {
        setNowTop(row.offsetTop + (minutes / 60) * row.offsetHeight);
      }
      setNowLabel(`${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
    // Recalcula também quando a jornada de trabalho carrega: ela muda a altura das linhas de hora
    // (o botão "Novo Agendamento" só aparece dentro do expediente), o que desalinha a posição já calculada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workHours]);

  useEffect(() => {
    // Só rola até o horário atual uma vez, ao carregar a página (não deve "puxar" o scroll depois que o usuário navegar)
    if (nowTop === null || hasScrolledToNowRef.current || !calendarRef.current) return;

    const container = calendarRef.current;
    container.scrollTop = nowTop - container.clientHeight / 2;
    hasScrolledToNowRef.current = true;
  }, [nowTop]);

  // Dia selecionado (mostrado no header) e mês visível no mini-calendário
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const realToday = new Date();

  // Seleciona um dia e garante que o mini-calendário mostre o mês dele
  const selectDay = (d: Date) => {
    setSelectedDay(d);
    if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // Avança/volta o dia selecionado (setas do header)
  const changeSelectedDay = (deltaDays: number) => {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + deltaDays);
    selectDay(next);
  };

  // Avança/volta o mês exibido no mini-calendário, sem mexer no dia selecionado
  const changeViewMonth = (deltaMonths: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + deltaMonths, 1));
  };

  // Semanas completas do mês em exibição (inclui dias do mês anterior/seguinte para fechar a grade)
  const monthCells = (() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = segunda
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - firstWeekday);
    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  const headerDayLabel = `${weekDays[(selectedDay.getDay() + 6) % 7]},${selectedDay.getDate()} ${monthNamesShort[selectedDay.getMonth()]}`;

  // Controla a abertura do painel "Novo Agendamento" (e o overlay escurecido atrás dele)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  // Etapas do formulário: 1 Cliente, 2 Serviço, 3 Data/Horário, 4 Confirmação
  type AppointmentStep = 1 | 2 | 3 | 4;
  const [appointmentStep, setAppointmentStep] = useState<AppointmentStep>(1);
  const appointmentStepTitles: Record<AppointmentStep, string> = {
    1: "Escolha o cliente",
    2: "Escolha o serviço",
    3: "Data e horário",
    4: "Confirmar agendamento",
  };
  const editAppointmentStepTitles: Record<AppointmentStep, string> = {
    1: "Escolha o cliente",
    2: "Escolha o serviço",
    3: "Data e horário",
    4: "Confirmar edição",
  };

  // Clientes e serviços já cadastrados no backend, usados para preencher os selects do formulário
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Quando preenchido, o painel "Novo Agendamento" vira "Editar agendamento" e salva com PATCH em vez de POST
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  // Endereço do agendamento sendo editado — usado pra pré-selecionar assim que os endereços do cliente carregarem
  const pendingEditAddressIdRef = useRef<number | null>(null);

  // Criar cliente novo direto na etapa 1, sem sair do fluxo de agendamento
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerDocument, setNewCustomerDocument] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState("");

  // Campos do formulário de novo agendamento
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");

  // Atendimento a domicílio: precisa saber se é "na hora marcada" ou o cliente vem até o local
  const [isHomeService, setIsHomeService] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "">("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [savingAddress, setSavingAddress] = useState(false);
  const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  // Estimativa de deslocamento (Google Routes API, com fallback OSRM) pro endereço
  // do cliente selecionado — mesmo cálculo usado no agendamento público
  const [travelEstimate, setTravelEstimate] = useState<{
    minutes: number;
    km: number | null;
    cost: number;
    exceedsMaxDistance: boolean;
    maxDistanceKm: number | null;
    unavailable: boolean;
  } | null>(null);
  const [loadingTravelEstimate, setLoadingTravelEstimate] = useState(false);

  // Busca clientes e serviços já cadastrados uma vez (usados no formulário e para mostrar nome/serviço nos blocos da grade)
  useEffect(() => {
    Promise.all([apiFetch("/customers"), apiFetch("/services")])
      .then(([custs, servs]) => {
        setCustomers(custs);
        setServices(servs.filter((s: Service & { active?: boolean }) => s.active !== false));
      })
      .catch(() => setAppointmentError("Erro ao carregar clientes e serviços"));
  }, []);

  // Agendamentos reais do dia selecionado, vindos do backend (o mesmo endpoint que o calendário antigo usava)
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Modal de detalhes: abre ao clicar num agendamento já existente na grade
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [updatingAppointmentStatus, setUpdatingAppointmentStatus] = useState(false);

  // Atualiza o status do agendamento (cancelar / concluir agora) — mesmo endpoint que o calendário antigo usava
  const updateAppointmentStatus = async (id: number, status: string) => {
    setUpdatingAppointmentStatus(true);
    try {
      await apiFetch(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erro ao atualizar agendamento");
    } finally {
      setUpdatingAppointmentStatus(false);
    }
  };

  const loadAppointments = () => {
    apiFetch(`/appointments?date=${dayKey(selectedDay)}`)
      .then(setAppointments)
      .catch(() => setAppointments([]));
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Bloqueios manuais (folga, almoço, indisponibilidade) do dia selecionado
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const loadBlockedSlots = () => {
    const from = `${dayKey(selectedDay)}T00:00:00.000Z`;
    const to = `${dayKey(selectedDay)}T23:59:59.999Z`;
    apiFetch(`/blocked-slots?from=${from}&to=${to}`)
      .then(setBlockedSlots)
      .catch(() => setBlockedSlots([]));
  };

  useEffect(() => {
    loadBlockedSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Modal de detalhes de um bloqueio já existente — abre ao clicar num bloco de bloqueio na grade
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<BlockedSlot | null>(null);
  const [deletingBlockedSlot, setDeletingBlockedSlot] = useState(false);

  const handleDeleteBlockedSlot = async (id: number) => {
    setDeletingBlockedSlot(true);
    try {
      await apiFetch(`/blocked-slots/${id}`, { method: "DELETE" });
      setSelectedBlockedSlot(null);
      loadBlockedSlots();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erro ao remover bloqueio");
    } finally {
      setDeletingBlockedSlot(false);
    }
  };

  // Painel "Bloquear horário": pega a hora clicada como início, o usuário só define o fim
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockTitle, setBlockTitle] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");

  const closeBlockPanel = () => {
    setIsBlockOpen(false);
    setBlockStartTime("");
    setBlockEndTime("");
    setBlockTitle("");
    setBlockError("");
  };

  const handleCreateBlock = async () => {
    if (!blockStartTime || !blockEndTime) {
      setBlockError("Informe o horário final do bloqueio");
      return;
    }
    if (parseTimeToMinutes(blockEndTime) <= parseTimeToMinutes(blockStartTime)) {
      setBlockError("O horário final deve ser depois do início");
      return;
    }
    setSavingBlock(true);
    setBlockError("");
    try {
      await apiFetch("/blocked-slots", {
        method: "POST",
        body: JSON.stringify({
          type: "block",
          title: blockTitle.trim() || "Indisponível",
          startAt: `${dayKey(selectedDay)}T${blockStartTime}:00.000Z`,
          endAt: `${dayKey(selectedDay)}T${blockEndTime}:00.000Z`,
        }),
      });
      closeBlockPanel();
      loadBlockedSlots();
    } catch (error) {
      setBlockError(error instanceof Error ? error.message : "Erro ao bloquear horário");
    } finally {
      setSavingBlock(false);
    }
  };

  useEffect(() => {
    apiFetch(`/availability?date=${dayKey(selectedDay)}&tz=${tzOffsetMin}`)
      .then((data) => setWorkHours({
        isWorkDay: data.isWorkDay,
        workStart: data.workStart,
        workEnd: data.workEnd,
        interval: data.interval ?? 15,
        buffer: data.buffer ?? 0,
        breakStart: data.breakStart ?? null,
        breakEnd: data.breakEnd ?? null,
      }))
      .catch(() => setWorkHours(null));
  }, [selectedDay]);

  const workHoursLabel = !workHours
    ? ""
    : !workHours.isWorkDay
      ? "Sem expediente"
      : `${workHours.workStart} - ${workHours.workEnd}`;

  // Converte "HH:mm" em minutos desde 00:00, pra comparar horários com a jornada de trabalho
  const parseTimeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const workStartMinutes = workHours?.workStart ? parseTimeToMinutes(workHours.workStart) : null;
  const workEndMinutes = workHours?.workEnd ? parseTimeToMinutes(workHours.workEnd) : null;

  // Só permite abrir "Novo Agendamento" numa hora se o dia tiver expediente e a hora estiver dentro da jornada
  const isHourWithinWorkHours = (hour: number) => {
    if (!workHours?.isWorkDay || workStartMinutes === null || workEndMinutes === null) return false;
    return hour * 60 >= workStartMinutes && hour * 60 < workEndMinutes;
  };

  // Não pode agendar em horário que já passou. Usa o fuso de Brasília (mesmo usado na linha do "agora"),
  // já que os horários da grade são exibidos como hora de parede, sem conversão de fuso.
  const isHourInPast = (hour: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
    }).formatToParts(new Date());
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const nowDayKey = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
    const nowMinutes = get("hour") * 60 + get("minute");

    const selectedKey = dayKey(selectedDay);
    if (selectedKey < nowDayKey) return true;
    if (selectedKey > nowDayKey) return false;
    // Só fica indisponível quando a hora termina por completo (ex.: 9h só vira indisponível às 10h)
    return (hour + 1) * 60 <= nowMinutes;
  };

  // "Agora" no mesmo formato de hora de parede (Brasília) usado em appt.scheduledAt/blockedSlot — os
  // campos vêm com "Z" mas guardam a hora local literal, sem conversão de fuso. Comparar contra
  // Date.now() (UTC real) direto adianta o relógio em ~3h e marca agendamentos futuros como já passados.
  const nowWallClockMs = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(new Date());
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  };

  // Posição vertical (em px) do início de cada hora, medida a partir das linhas já renderizadas.
  // offsets[24] é o fim da última linha — permite calcular a altura de qualquer agendamento por interpolação.
  const [hourOffsets, setHourOffsets] = useState<number[]>([]);

  useEffect(() => {
    const offsets: number[] = [];
    for (let h = 0; h < 24; h++) {
      const row = hourRowRefs.current[h];
      offsets.push(row ? row.offsetTop : 0);
    }
    const lastRow = hourRowRefs.current[23];
    offsets.push(lastRow ? lastRow.offsetTop + lastRow.offsetHeight : 0);
    setHourOffsets(offsets);
    // Recalcula também quando a jornada de trabalho carrega/muda: ela altera a altura das linhas
    // (o botão "Novo Agendamento" só existe dentro do expediente), o que desalinha os offsets antigos.
  }, [appointments, blockedSlots, workHours]);

  // Converte "minutos desde 00:00" em posição vertical (px), interpolando dentro da hora correspondente
  const minutesToOffsetPx = (totalMinutes: number) => {
    const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60));
    const hour = Math.min(Math.floor(clamped / 60), 23);
    const fraction = (clamped - hour * 60) / 60;
    const start = hourOffsets[hour] ?? 0;
    const end = hourOffsets[hour + 1] ?? start;
    return start + fraction * (end - start);
  };

  // Inverso de minutesToOffsetPx: converte uma posição vertical (px) de volta em "minutos desde 00:00",
  // usado para descobrir o novo horário quando o profissional arrasta um agendamento na grade
  const offsetPxToMinutes = (px: number) => {
    if (hourOffsets.length < 25) return 0;
    const total = hourOffsets[24] ?? 0;
    const clamped = Math.max(hourOffsets[0] ?? 0, Math.min(px, total));
    for (let h = 0; h < 24; h++) {
      const start = hourOffsets[h] ?? 0;
      const end = hourOffsets[h + 1] ?? start;
      if (clamped <= end) {
        const fraction = end > start ? (clamped - start) / (end - start) : 0;
        return h * 60 + fraction * 60;
      }
    }
    return 24 * 60;
  };

  // Arrastar um agendamento na grade pra mudar o horário: guarda o estado do drag num ref (não re-renderiza
  // a cada pixel) e só usa state pra prévia visual (top) e pra saber qual bloco está sendo arrastado.
  // Também cobre o clique simples (pointerdown sem mover vira "abrir detalhes"), então o bloco não usa onClick.
  const appointmentDragRef = useRef<{ id: number; startClientY: number; startTop: number; height: number; draggable: boolean; moved: boolean } | null>(null);
  const [draggingAppointmentId, setDraggingAppointmentId] = useState<number | null>(null);
  const [dragPreviewTop, setDragPreviewTop] = useState<number | null>(null);

  const handleAppointmentPointerDown = (e: React.PointerEvent<HTMLDivElement>, appt: Appointment, top: number, height: number) => {
    if (e.button !== 0) return;
    const draggable = !["completed", "cancelled", "no_show"].includes(appt.status);
    e.currentTarget.setPointerCapture(e.pointerId);
    appointmentDragRef.current = { id: appt.id, startClientY: e.clientY, startTop: top, height, draggable, moved: false };
    if (draggable) {
      setDraggingAppointmentId(appt.id);
      setDragPreviewTop(top);
    }
  };

  const handleAppointmentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = appointmentDragRef.current;
    if (!drag || !drag.draggable) return;
    const deltaY = e.clientY - drag.startClientY;
    if (Math.abs(deltaY) > 3) drag.moved = true;
    const maxTop = Math.max((hourOffsets[24] ?? 0) - drag.height, 0);
    const newTop = Math.max(0, Math.min(drag.startTop + deltaY, maxTop));
    setDragPreviewTop(newTop);
  };

  const handleAppointmentPointerUp = async (e: React.PointerEvent<HTMLDivElement>, appt: Appointment) => {
    const drag = appointmentDragRef.current;
    appointmentDragRef.current = null;
    setDraggingAppointmentId(null);
    if (!drag) return;

    if (!drag.draggable || !drag.moved) {
      // Não arrastou de verdade (ou não é arrastável) — foi um clique, abre os detalhes normalmente
      setDragPreviewTop(null);
      setSelectedAppointment(appt);
      return;
    }

    const finalTop = dragPreviewTop ?? drag.startTop;
    setDragPreviewTop(null);

    const interval = stepMinutes;
    const rawMinutes = offsetPxToMinutes(finalTop);
    const snapped = Math.round(rawMinutes / interval) * interval;
    const clampedMinutes = Math.max(0, Math.min(snapped, 24 * 60 - appt.duration));
    const newTime = `${String(Math.floor(clampedMinutes / 60)).padStart(2, "0")}:${String(clampedMinutes % 60).padStart(2, "0")}`;
    const newScheduledAt = `${dayKey(selectedDay)}T${newTime}:00.000Z`;

    if (newScheduledAt === appt.scheduledAt) return;

    const previousAppointments = appointments;
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, scheduledAt: newScheduledAt } : a)));

    try {
      await apiFetch(`/appointments/${appt.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerId: appt.customerId,
          serviceId: appt.serviceId,
          scheduledAt: newScheduledAt,
          tzOffsetMin,
          isHomeService: appt.isHomeService ?? false,
          customerAddressId: appt.customerAddressId ?? null,
          notes: appt.notes,
        }),
      });
      loadAppointments();
    } catch (error) {
      setAppointments(previousAppointments);
      showError(error instanceof Error ? error.message : "Não foi possível mover o agendamento");
    }
  };

  // Arrastar um bloqueio de horário na grade pra mudar o horário — mesmo padrão do arrastar de
  // agendamento acima (ref pro drag em si, state só pra prévia visual), preservando a duração do bloqueio.
  const blockDragRef = useRef<{ id: number; startClientY: number; startTop: number; height: number; durationMinutes: number; moved: boolean } | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<number | null>(null);
  const [blockDragPreviewTop, setBlockDragPreviewTop] = useState<number | null>(null);

  const handleBlockPointerDown = (e: React.PointerEvent<HTMLDivElement>, block: BlockedSlot, top: number, height: number) => {
    if (e.button !== 0) return;
    const start = new Date(block.startAt);
    const end = new Date(block.endAt);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    e.currentTarget.setPointerCapture(e.pointerId);
    blockDragRef.current = { id: block.id, startClientY: e.clientY, startTop: top, height, durationMinutes, moved: false };
    setDraggingBlockId(block.id);
    setBlockDragPreviewTop(top);
  };

  const handleBlockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = blockDragRef.current;
    if (!drag) return;
    const deltaY = e.clientY - drag.startClientY;
    if (Math.abs(deltaY) > 3) drag.moved = true;
    const maxTop = Math.max((hourOffsets[24] ?? 0) - drag.height, 0);
    const newTop = Math.max(0, Math.min(drag.startTop + deltaY, maxTop));
    setBlockDragPreviewTop(newTop);
  };

  const handleBlockPointerUp = async (e: React.PointerEvent<HTMLDivElement>, block: BlockedSlot) => {
    const drag = blockDragRef.current;
    blockDragRef.current = null;
    setDraggingBlockId(null);
    if (!drag) return;

    if (!drag.moved) {
      // Não arrastou de verdade — foi um clique, abre os detalhes normalmente
      setBlockDragPreviewTop(null);
      setSelectedBlockedSlot(block);
      return;
    }

    const finalTop = blockDragPreviewTop ?? drag.startTop;
    setBlockDragPreviewTop(null);

    const interval = stepMinutes;
    const rawMinutes = offsetPxToMinutes(finalTop);
    const snapped = Math.round(rawMinutes / interval) * interval;
    const clampedStart = Math.max(0, Math.min(snapped, 24 * 60 - drag.durationMinutes));
    const clampedEnd = clampedStart + drag.durationMinutes;
    const newStartAt = `${dayKey(selectedDay)}T${minutesToTimeLabel(clampedStart)}:00.000Z`;
    const newEndAt = `${dayKey(selectedDay)}T${minutesToTimeLabel(clampedEnd)}:00.000Z`;

    if (newStartAt === block.startAt) return;

    const previousBlockedSlots = blockedSlots;
    setBlockedSlots((prev) => prev.map((b) => (b.id === block.id ? { ...b, startAt: newStartAt, endAt: newEndAt } : b)));

    try {
      await apiFetch(`/blocked-slots/${block.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startAt: newStartAt, endAt: newEndAt }),
      });
      loadBlockedSlots();
    } catch (error) {
      setBlockedSlots(previousBlockedSlots);
      showError(error instanceof Error ? error.message : "Não foi possível mover o bloqueio");
    }
  };

  // Selecionar um intervalo arrastando na grade (área vazia) — ao soltar, abre um menu perguntando se é
  // um Agendamento ou um Bloqueio, já com o horário arrastado preenchido. Um clique simples (sem arrastar)
  // usa 1h a partir do ponto clicado.
  const rangeSelectRef = useRef<{ startPx: number; startClientY: number; moved: boolean } | null>(null);
  const [rangeSelectPreview, setRangeSelectPreview] = useState<{ top: number; height: number } | null>(null);
  const [rangeMenu, setRangeMenu] = useState<{ top: number; startMinutes: number; endMinutes: number } | null>(null);

  const getPxFromClientY = (clientY: number) => {
    if (!calendarRef.current) return 0;
    const rect = calendarRef.current.getBoundingClientRect();
    return clientY - rect.top + calendarRef.current.scrollTop;
  };

  const handleRangePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !workHours?.isWorkDay) return;
    setRangeMenu(null);
    const px = getPxFromClientY(e.clientY);
    const hour = Math.floor(offsetPxToMinutes(px) / 60);
    if (isHourInPast(hour) || !isHourWithinWorkHours(hour)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    rangeSelectRef.current = { startPx: px, startClientY: e.clientY, moved: false };
    setRangeSelectPreview({ top: px, height: 4 });
  };

  const handleRangePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = rangeSelectRef.current;
    if (!drag) return;
    if (Math.abs(e.clientY - drag.startClientY) > 3) drag.moved = true;
    const px = getPxFromClientY(e.clientY);
    const top = Math.min(drag.startPx, px);
    const height = Math.max(Math.abs(px - drag.startPx), 4);
    setRangeSelectPreview({ top, height });
  };

  const handleRangePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = rangeSelectRef.current;
    rangeSelectRef.current = null;
    setRangeSelectPreview(null);
    if (!drag) return;

    const px = getPxFromClientY(e.clientY);
    const interval = stepMinutes;
    const snap = (m: number) => Math.round(m / interval) * interval;

    let startMinutes = snap(offsetPxToMinutes(Math.min(drag.startPx, px)));
    let endMinutes = drag.moved
      ? snap(offsetPxToMinutes(Math.max(drag.startPx, px)))
      : startMinutes + Math.max(interval, 60);

    startMinutes = Math.max(0, Math.min(startMinutes, 24 * 60 - interval));
    endMinutes = Math.min(Math.max(endMinutes, startMinutes + interval), 24 * 60);

    setRangeMenu({ top: minutesToOffsetPx(startMinutes), startMinutes, endMinutes });
  };

  const minutesToTimeLabel = (totalMinutes: number) =>
    `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;

  // Horas cobertas por algum agendamento ou bloqueio — nelas o placeholder "Novo Agendamento" não pode
  // aparecer, senão ele fica visível por baixo/atrás do bloco real
  const occupiedHours = new Set<number>();
  appointments.forEach((appt) => {
    const scheduled = new Date(appt.scheduledAt);
    const startMinutes = scheduled.getUTCHours() * 60 + scheduled.getUTCMinutes();
    const endMinutes = startMinutes + appt.duration;
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.ceil(endMinutes / 60);
    for (let h = startHour; h < endHour && h < 24; h++) occupiedHours.add(h);
  });
  blockedSlots.forEach((block) => {
    const start = new Date(block.startAt);
    const end = new Date(block.endAt);
    const startHour = Math.floor((start.getUTCHours() * 60 + start.getUTCMinutes()) / 60);
    const endMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();
    const endHour = end.getUTCDate() !== start.getUTCDate() ? 24 : Math.ceil(endMinutes / 60);
    for (let h = startHour; h < endHour && h < 24; h++) occupiedHours.add(h);
  });

  // Busca os endereços já cadastrados do cliente quando "domicílio" é marcado
  useEffect(() => {
    if (!isHomeService || !selectedCustomerId) return;

    apiFetch(`/customers/${selectedCustomerId}/addresses`)
      .then((data: CustomerAddress[]) => {
        setAddresses(data);
        if (data.length === 0) {
          setShowAddressForm(true);
        } else {
          const pendingId = pendingEditAddressIdRef.current;
          const pending = pendingId ? data.find((a) => a.id === pendingId) : null;
          const primary = pending ?? data.find((a) => a.isPrimary) ?? data[0];
          setSelectedAddressId(primary.id);
        }
        pendingEditAddressIdRef.current = null;
      })
      .catch(() => setAddresses([]));
  }, [isHomeService, selectedCustomerId]);

  // Estimativa de custo de deslocamento (Google Routes API) assim que cliente
  // e endereço de domicílio estão definidos — mesmo endpoint /availability
  // usado na grade, que já calcula isso quando recebe homeService+addressId
  useEffect(() => {
    if (!isHomeService || !selectedCustomerId || !selectedAddressId) {
      setTravelEstimate(null);
      return;
    }

    setLoadingTravelEstimate(true);
    const date = appointmentDate || dayKey(selectedDay);
    apiFetch(
      `/availability?date=${date}&tz=${tzOffsetMin}&homeService=1&customerId=${selectedCustomerId}&addressId=${selectedAddressId}`
    )
      .then((data) => {
        setTravelEstimate({
          minutes: data.travelMinutes ?? 0,
          km: data.travelKm ?? null,
          cost: data.travelCost ?? 0,
          exceedsMaxDistance: !!data.exceedsMaxDistance,
          maxDistanceKm: data.maxDistanceKm ?? null,
          unavailable: !!data.travelUnavailable,
        });
      })
      .catch(() => setTravelEstimate(null))
      .finally(() => setLoadingTravelEstimate(false));
  }, [isHomeService, selectedCustomerId, selectedAddressId, appointmentDate]);

  // Busca o endereço automaticamente quando o CEP tem 8 dígitos (mesma lógica do calendário antigo)
  useEffect(() => {
    if (!showAddressForm) return;
    const numbers = addressForm.cep.replace(/\D/g, "");
    if (numbers.length !== 8) {
      setCepStatus(numbers.length > 0 ? { type: "error", message: "CEP deve conter 8 dígitos." } : null);
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
        setAddressForm((p) => ({
          ...p,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
        setCepStatus({ type: "success", message: "Endereço encontrado!" });
      } catch {
        setCepStatus({ type: "error", message: "Erro ao buscar CEP." });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [addressForm.cep, showAddressForm]);

  const handleCreateAddress = async () => {
    if (!selectedCustomerId) return;
    const a = addressForm;
    if (!a.cep || !a.street || !a.number || !a.neighborhood || !a.city || !a.state) {
      setAppointmentError("Preencha o endereço completo para o atendimento a domicílio");
      return;
    }
    setSavingAddress(true);
    setAppointmentError("");
    try {
      const created = await apiFetch(`/customers/${selectedCustomerId}/addresses`, {
        method: "POST",
        body: JSON.stringify({ customerId: Number(selectedCustomerId), ...a, isPrimary: addresses.length === 0 }),
      });
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm({ ...emptyAddress });
      setCepStatus(null);
    } catch (error) {
      setAppointmentError(error instanceof Error ? error.message : "Erro ao salvar endereço");
    } finally {
      setSavingAddress(false);
    }
  };

  // Ao trocar o serviço, pré-preenche duração e valor com os dados já cadastrados dele
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((s) => String(s.id) === serviceId);
    if (service) {
      setDuration(String(service.duration));
      setPrice(service.price);
    }
  };

  const resetNewCustomerForm = () => {
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerDocument("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewCustomerNotes("");
    setNewCustomerError("");
  };

  // Cria um cliente sem sair do fluxo de agendamento — ao salvar, já entra
  // selecionado na etapa 1 (mesmos campos da tela de Clientes)
  const handleQuickCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      setNewCustomerError("O nome do cliente é obrigatório");
      return;
    }

    setCreatingCustomer(true);
    setNewCustomerError("");
    try {
      const created = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: newCustomerName.trim(),
          document: newCustomerDocument.trim() || null,
          phone: newCustomerPhone.trim() || null,
          email: newCustomerEmail.trim() || null,
          notes: newCustomerNotes.trim() || null,
        }),
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomerId(String(created.id));
      resetNewCustomerForm();
    } catch (error) {
      setNewCustomerError(error instanceof Error ? error.message : "Erro ao criar cliente");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Trava o horário digitado no intervalo da agenda configurado (ex: de 10 em
  // 10 min) — evita agendar num horário "torto" que não existiria na grade
  const handleAppointmentTimeChange = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) {
      setAppointmentTime(value);
      return;
    }
    const interval = stepMinutes;
    const totalMinutes = Math.min(Math.max(Math.round((h * 60 + m) / interval) * interval, 0), 23 * 60 + 59);
    const snappedH = Math.floor(totalMinutes / 60);
    const snappedM = totalMinutes % 60;
    setAppointmentTime(`${String(snappedH).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`);
  };

  const resetAppointmentForm = () => {
    resetNewCustomerForm();
    setSelectedCustomerId("");
    setCustomerSearch("");
    setSelectedServiceId("");
    setAppointmentDate("");
    setAppointmentTime("");
    setDuration("30");
    setPrice("");
    setPaymentStatus("unpaid");
    setNotes("");
    setAppointmentError("");
    setIsHomeService(false);
    setAddresses([]);
    setSelectedAddressId("");
    setShowAddressForm(false);
    setAddressForm({ ...emptyAddress });
    setCepStatus(null);
    setTravelEstimate(null);
    setAppointmentStep(1);
    setEditingAppointmentId(null);
    pendingEditAddressIdRef.current = null;
  };

  const closeNewAppointment = () => {
    setIsNewAppointmentOpen(false);
    resetAppointmentForm();
  };

  // Botão único "Novo Agendamento": abre o painel já com o dia selecionado, sem hora pré-definida —
  // o horário é escolhido dentro do próprio formulário (etapa 3) ou arrastando na grade.
  const openNewAppointmentForDay = (startMinutes?: number) => {
    resetAppointmentForm();
    setAppointmentDate(dayKey(selectedDay));
    if (startMinutes !== undefined) setAppointmentTime(minutesToTimeLabel(startMinutes));
    setIsNewAppointmentOpen(true);
  };

  // Menu de seleção (aparece ao soltar o arraste na grade): "Bloqueio" abre o painel de bloqueio
  // já preenchido com o intervalo arrastado.
  const openBlockPanelFromRange = (startMinutes: number, endMinutes: number) => {
    setBlockStartTime(minutesToTimeLabel(startMinutes));
    setBlockEndTime(minutesToTimeLabel(endMinutes));
    setBlockTitle("");
    setBlockError("");
    setIsBlockOpen(true);
  };

  // Abre o painel "Novo Agendamento" já preenchido com os dados de um agendamento existente, para edição
  const openEditAppointment = (appt: Appointment) => {
    resetAppointmentForm();
    setSelectedAppointment(null);

    const scheduled = new Date(appt.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");

    setEditingAppointmentId(appt.id);
    setSelectedCustomerId(String(appt.customerId));
    setSelectedServiceId(String(appt.serviceId));
    setAppointmentDate(`${scheduled.getUTCFullYear()}-${pad(scheduled.getUTCMonth() + 1)}-${pad(scheduled.getUTCDate())}`);
    setAppointmentTime(`${pad(scheduled.getUTCHours())}:${pad(scheduled.getUTCMinutes())}`);
    setDuration(String(appt.duration));
    setPrice(appt.price);
    setNotes(appt.notes || "");
    setIsHomeService(!!appt.isHomeService);
    pendingEditAddressIdRef.current = appt.customerAddressId ?? null;
    setAppointmentStep(1);
    setIsNewAppointmentOpen(true);
  };

  // Valida se a etapa atual pode avançar para a próxima
  const canGoToNextStep = () => {
    if (appointmentStep === 1) return !!selectedCustomerId;
    if (appointmentStep === 2) return !!selectedServiceId;
    if (appointmentStep === 3) {
      if (!appointmentDate || !appointmentTime) return false;
      if (isHomeService && !selectedAddressId) return false;
      if (appointmentDate === dayKey(selectedDay) && workHours) {
        if (!workHours.isWorkDay) return false;
        const chosenMinutes = parseTimeToMinutes(appointmentTime);
        if (workStartMinutes !== null && workEndMinutes !== null &&
          (chosenMinutes < workStartMinutes || chosenMinutes >= workEndMinutes)) return false;
      }
      return true;
    }
    return true;
  };

  const goToNextStep = () => {
    setAppointmentError("");
    if (!canGoToNextStep()) {
      setAppointmentError("Preencha os campos desta etapa para continuar");
      return;
    }
    setAppointmentStep((s) => (Math.min(s + 1, 4) as AppointmentStep));
  };

  const goToPreviousStep = () => {
    setAppointmentError("");
    setAppointmentStep((s) => (Math.max(s - 1, 1) as AppointmentStep));
  };

  const handleSaveAppointment = async () => {
    if (!selectedCustomerId || !selectedServiceId || !appointmentDate || !appointmentTime) {
      setAppointmentError("Preencha cliente, serviço, data e horário");
      return;
    }
    if (isHomeService && !selectedAddressId) {
      setAppointmentError("Selecione ou cadastre o endereço para o atendimento a domicílio");
      return;
    }
    // Só valida a jornada quando a data escolhida no formulário é a mesma que já temos carregada (selectedDay)
    if (appointmentDate === dayKey(selectedDay) && workHours) {
      if (!workHours.isWorkDay) {
        setAppointmentError("Não há expediente neste dia — escolha outra data");
        return;
      }
      const chosenMinutes = parseTimeToMinutes(appointmentTime);
      if (workStartMinutes !== null && workEndMinutes !== null &&
        (chosenMinutes < workStartMinutes || chosenMinutes >= workEndMinutes)) {
        setAppointmentError(`Horário fora da jornada de trabalho (${workHours.workStart} - ${workHours.workEnd})`);
        return;
      }
    }

    setSavingAppointment(true);
    setAppointmentError("");
    try {
      // Hora de parede: o horário digitado é exatamente o horário agendado, sem conversão de fuso
      const body = {
        customerId: Number(selectedCustomerId),
        serviceId: Number(selectedServiceId),
        scheduledAt: `${appointmentDate}T${appointmentTime}:00.000Z`,
        tzOffsetMin,
        duration: Number(duration),
        price,
        paymentStatus,
        isHomeService,
        customerAddressId: isHomeService ? selectedAddressId : null,
        notes: notes.trim() || null,
      };
      if (editingAppointmentId) {
        await apiFetch(`/appointments/${editingAppointmentId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/appointments", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      closeNewAppointment();
      loadAppointments();
    } catch (error) {
      setAppointmentError(error instanceof Error ? error.message : "Erro ao salvar agendamento");
    } finally {
      setSavingAppointment(false);
    }
  };

  return (
    <div className="container-calendar">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
      {/* Calendar header */}
      <div className="header-calendar">
        <div className="header-content">
          <button onClick={() => changeSelectedDay(-1)} aria-label="Dia anterior"><FiChevronLeft /></button>
          <div
            className={`header-content-text-container${isNavCalendarOpen ? " header-content-text-container-active" : ""}`}
            onClick={() => setIsNavCalendarOpen((prev) => !prev)}
          >
            <div className="header-content-text">
              <span>{headerDayLabel}</span>
              <span>{workHoursLabel}</span>
            </div>
            <FiChevronDown />
          </div>
          <button onClick={() => changeSelectedDay(1)} aria-label="Próximo dia"><FiChevronRight /></button>
        </div>

        {/* Mini-calendário: escondido por padrão, aparece como dropdown ao clicar na data acima */}
        {isNavCalendarOpen && (
          <>
            <div className="nav-calendar-backdrop" onClick={() => setIsNavCalendarOpen(false)} />
            <div className="nav-calendar nav-calendar-dropdown">
          {/* Mini-calendário de navegação por mês */}
          <div className="mini-calendar-header">
            <span>{monthNamesFull[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <div className="mini-calendar-header-actions">
              <button onClick={() => changeViewMonth(-1)} aria-label="Mês anterior"><FiChevronLeft /></button>
              <button onClick={() => changeViewMonth(1)} aria-label="Próximo mês"><FiChevronRight /></button>
            </div>
          </div>

          {/* Grade com os dias da semana e os dias do mês (inclui dias fora do mês, esmaecidos) */}
          <div className="mini-calendar-grid">
            {weekDays.map((day) => (
              <span key={day} className="mini-calendar-weekday">{day}</span>
            ))}
            {monthCells.map((day) => {
              const classes = [
                "mini-calendar-day",
                day.getMonth() !== viewDate.getMonth() ? "mini-calendar-day-out" : "",
                dayKey(day) === dayKey(realToday) ? "mini-calendar-day-today" : "",
                dayKey(day) === dayKey(selectedDay) ? "mini-calendar-day-selected" : "",
              ].join(" ").trim();
              return (
                <span
                  key={dayKey(day)}
                  className={classes}
                  onClick={() => {
                    selectDay(day);
                    setIsNavCalendarOpen(false);
                  }}
                >
                  {day.getDate()}
                </span>
              );
            })}
          </div>

          <div className="nav-calendar-divider" />

          {/* Painel de filtros para destacar agendamentos na agenda */}
          <div className="highlight-appointments">
            <button
              className="highlight-appointments-toggle"
              onClick={() => setHighlightOpen((prev) => !prev)}
            >
              <span>Destacar Agendamentos</span>
              {highlightOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {highlightOpen && (
              <div className="highlight-appointments-content">
                {/* Filtro por status de pagamento */}
                <div className="filter-section">
                  <span className="filter-section-title">Pagamentos</span>

                  <label className={`filter-row${paidFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={paidFilter}
                      onChange={() => setPaidFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-paid"><FiDollarSign /></span>
                    <span className="filter-row-label">Pago</span>
                  </label>

                  <label className={`filter-row${unpaidFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={unpaidFilter}
                      onChange={() => setUnpaidFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-unpaid"><FiDollarSign /></span>
                    <span className="filter-row-label">Não pago</span>
                  </label>
                </div>

                {/* Filtro por status da reserva */}
                <div className="filter-section">
                  <span className="filter-section-title">Status da Reserva</span>

                  <label className={`filter-row${confirmedFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={confirmedFilter}
                      onChange={() => setConfirmedFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-confirmed"><FiCheck /></span>
                    <span className="filter-row-label">Confirmada</span>
                  </label>

                  <label className={`filter-row${unconfirmedFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={unconfirmedFilter}
                      onChange={() => setUnconfirmedFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-unconfirmed"><FiX /></span>
                    <span className="filter-row-label">Não confirmada</span>
                  </label>
                </div>

                {/* Filtro por local do atendimento */}
                <div className="filter-section">
                  <span className="filter-section-title">Local do Atendimento</span>

                  <label className={`filter-row${homeServiceFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={homeServiceFilter}
                      onChange={() => setHomeServiceFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-home"><FiHome /></span>
                    <span className="filter-row-label">A domicílio</span>
                  </label>
                </div>

                {/* Ações do painel de filtros */}
                <div className="highlight-appointments-actions">
                  <button className="btn-clear-filters" onClick={handleClearFilters}>Limpar</button>
                  <button className="btn-apply-filters">Aplicar</button>
                </div>
              </div>
            )}
          </div>
            </div>
          </>
        )}
      </div>
      <button className="new-appointment-trigger" onClick={() => openNewAppointmentForDay()}>
        <FiPlus /> Novo Agendamento
      </button>
      <div className="main-calendar">
        <div className="calendar" ref={calendarRef}>
          {/* Aviso quando o dia selecionado não tem expediente cadastrado */}
          {workHours && !workHours.isWorkDay && (
            <div className="calendar-no-workday">Sem expediente neste dia — não é possível criar agendamentos</div>
          )}

          {/* Linha indicando o horário atual, com o horário exibido acima dela */}
          {nowTop !== null && (
            <div className="current-time-indicator" style={{ top: nowTop }}>
              <span className="current-time-label">{nowLabel}</span>
              <div className="current-time-line" />
            </div>
          )}

          {hours.map((hour) => {
            const isWorkdayHour = isHourWithinWorkHours(hour);
            const interval = stepMinutes;
            // Marcações de minuto dentro da hora (ex.: :15, :30, :45 pra intervalo de 15 min) — só faz
            // sentido dentro do expediente, onde a hora tem altura suficiente pra mostrar as subdivisões
            const subHourMinutes: number[] = [];
            if (isWorkdayHour && interval > 0 && interval < 60) {
              for (let m = interval; m < 60; m += interval) subHourMinutes.push(m);
            }

            return (
            <div
              key={hour}
              className={`calendar-hour${isWorkdayHour ? " calendar-hour-workday" : ""}`}
              ref={(el) => { hourRowRefs.current[hour] = el; }}
            >
              <div className="calendar-hour-label">{String(hour).padStart(2, "0")}:00</div>

              {/* Line  */}
              <div className="container-tasks">
                <div className="calendar-hour-line"></div>
                {subHourMinutes.map((minute) => (
                  <div key={minute} className="calendar-subhour-line" style={{ top: `${(minute / 60) * 100}%` }} />
                ))}
                {!occupiedHours.has(hour) && isWorkdayHour && isHourInPast(hour) && (
                  <button className="task-default task-unavailable" disabled>
                    Horário indisponível
                  </button>
                )}
              </div>
            </div>
            );
          })}

          {/* Área de arrastar-para-selecionar: clique e arraste num horário livre define um intervalo;
              ao soltar, abre um menu perguntando se é um Agendamento ou um Bloqueio, já com a hora preenchida.
              Fica atrás dos blocos de agendamento/bloqueio (renderizados depois), então não intercepta cliques neles. */}
          {workHours?.isWorkDay && (
            <div
              className="calendar-range-select-layer"
              onPointerDown={handleRangePointerDown}
              onPointerMove={handleRangePointerMove}
              onPointerUp={handleRangePointerUp}
              style={{ height: hourOffsets[24] ?? 0 }}
            />
          )}
          {rangeSelectPreview && (
            <div
              className="range-select-preview"
              style={{ top: rangeSelectPreview.top, height: rangeSelectPreview.height }}
            />
          )}

          {/* Agendamentos reais do dia, desenhados por cima da grade — posição/altura calculadas a partir de scheduledAt + duration.
              Arrastáveis (exceto finalizados/cancelados): clique curto abre detalhes, arrastar reagenda o horário. */}
          {appointments.map((appt) => {
            // Hora de parede: os campos UTC guardam exatamente o horário agendado, sem conversão de fuso
            const scheduled = new Date(appt.scheduledAt);
            const startMinutes = scheduled.getUTCHours() * 60 + scheduled.getUTCMinutes();
            const endDate = new Date(scheduled.getTime() + appt.duration * 60000);
            const top = minutesToOffsetPx(startMinutes);
            const height = Math.max(minutesToOffsetPx(startMinutes + appt.duration) - top, 42);
            const customer = customers.find((c) => c.id === appt.customerId);
            const service = services.find((s) => s.id === appt.serviceId);
            const formatUTC = (d: Date) =>
              d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

            const isDragging = draggingAppointmentId === appt.id;
            const displayTop = isDragging && dragPreviewTop !== null ? dragPreviewTop : top;
            const canDrag = !["completed", "cancelled", "no_show"].includes(appt.status);
            // Com o filtro "A domicílio" ativo, esmaece os atendimentos que não são a domicílio
            const isDimmedByFilter = homeServiceFilter && !appt.isHomeService;

            // Enquanto arrasta, recalcula o horário exibido a partir da posição em tela (feedback em tempo real)
            let previewLabel = `${formatUTC(scheduled)} - ${formatUTC(endDate)}`;
            if (isDragging && dragPreviewTop !== null) {
              const interval = stepMinutes;
              const rawMinutes = offsetPxToMinutes(dragPreviewTop);
              const snapped = Math.max(0, Math.min(Math.round(rawMinutes / interval) * interval, 24 * 60 - appt.duration));
              const previewStart = `${String(Math.floor(snapped / 60)).padStart(2, "0")}:${String(snapped % 60).padStart(2, "0")}`;
              const previewEndMinutes = snapped + appt.duration;
              const previewEnd = `${String(Math.floor(previewEndMinutes / 60)).padStart(2, "0")}:${String(previewEndMinutes % 60).padStart(2, "0")}`;
              previewLabel = `${previewStart} - ${previewEnd}`;
            }

            // Tempo reservado depois do atendimento que não aparece no bloco em si, mas também não pode
            // receber outro agendamento: delay/descanso configurado pelo profissional + volta do deslocamento
            // (ida e volta, quando é a domicílio — só a volta sobra depois do horário do atendimento).
            // Desenha uma faixa listrada logo abaixo do bloco pra deixar isso visível, senão parece horário livre.
            const buffer = workHours?.buffer ?? 0;
            // Ida e volta: o mesmo dobro usado em computeDaySlots.ts pra reservar a agenda
            const travelRoundTripMinutes = appt.isHomeService ? (appt.travelMinutes ?? 0) * 2 : 0;
            const reservedAfterMinutes = buffer + travelRoundTripMinutes;
            const showBuffer = reservedAfterMinutes > 0 && !["cancelled", "no_show"].includes(appt.status);
            const bufferTop = top + height;
            const bufferHeight = showBuffer ? minutesToOffsetPx(startMinutes + appt.duration + reservedAfterMinutes) - bufferTop : 0;
            const bufferTitleParts = [
              travelRoundTripMinutes > 0 ? `${travelRoundTripMinutes} min de deslocamento (ida e volta)` : null,
              buffer > 0 ? `${buffer} min de descanso` : null,
            ].filter(Boolean);

            return (
              <Fragment key={appt.id}>
                <div
                  className={`appointment-block${isDragging ? " appointment-block-dragging" : ""}${canDrag ? " appointment-block-draggable" : ""}${isDimmedByFilter ? " appointment-block-dimmed" : ""}`}
                  style={{ top: displayTop, height, backgroundColor: statusColors[appt.status] ?? "#767676" }}
                  onPointerDown={(e) => handleAppointmentPointerDown(e, appt, top, height)}
                  onPointerMove={handleAppointmentPointerMove}
                  onPointerUp={(e) => handleAppointmentPointerUp(e, appt)}
                >
                  <div className="appointment-block-info">
                    <strong>{previewLabel}</strong>
                    <span>{customer?.name ?? `Cliente #${appt.customerId}`} · {service?.title ?? `Serviço #${appt.serviceId}`}</span>
                  </div>
                  {appt.isHomeService && <span className="appointment-block-badge">🏠</span>}
                </div>
                {showBuffer && bufferHeight > 0 && !isDragging && (
                  <div
                    className="appointment-buffer-strip"
                    style={{ top: bufferTop, height: bufferHeight }}
                    title={bufferTitleParts.join(" + ")}
                  >
                    <span>
                      Ocupado até {(() => {
                        const endMinutes = startMinutes + appt.duration + reservedAfterMinutes;
                        return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
                      })()} · {bufferTitleParts.join(" + ")}
                    </span>
                  </div>
                )}
              </Fragment>
            );
          })}

          {/* Bloqueios manuais do dia (folga, almoço, indisponibilidade), desenhados por cima da grade */}
          {blockedSlots.map((block) => {
            const start = new Date(block.startAt);
            const end = new Date(block.endAt);
            const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
            const endMinutes = end.getUTCDate() !== start.getUTCDate() ? 24 * 60 : end.getUTCHours() * 60 + end.getUTCMinutes();
            const top = minutesToOffsetPx(startMinutes);
            const height = Math.max(minutesToOffsetPx(endMinutes) - top, 42);
            const formatUTC = (d: Date) =>
              d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
            const isDraggingBlock = draggingBlockId === block.id;
            const displayTop = isDraggingBlock && blockDragPreviewTop !== null ? blockDragPreviewTop : top;

            return (
              <div
                key={`block-${block.id}`}
                className={`appointment-block blocked-slot-block appointment-block-draggable${isDraggingBlock ? " appointment-block-dragging" : ""}`}
                style={{ top: displayTop, height }}
                onPointerDown={(e) => handleBlockPointerDown(e, block, top, height)}
                onPointerMove={handleBlockPointerMove}
                onPointerUp={(e) => handleBlockPointerUp(e, block)}
              >
                <div className="appointment-block-info">
                  <strong>{formatUTC(start)} - {formatUTC(end)}</strong>
                  <span>{block.title}</span>
                </div>
                <FiLock className="appointment-block-badge" />
              </div>
            );
          })}

          {/* Pausa fixa recorrente (ex: almoço), configurada em Configurações > Horários — bloqueia
              automaticamente esse período todo dia de trabalho, sem precisar criar um bloqueio manual */}
          {workHours?.isWorkDay && workHours.breakStart && workHours.breakEnd && (() => {
            const [bsH = 0, bsM = 0] = workHours.breakStart.split(":").map(Number);
            const [beH = 0, beM = 0] = workHours.breakEnd.split(":").map(Number);
            const top = minutesToOffsetPx(bsH * 60 + bsM);
            const height = Math.max(minutesToOffsetPx(beH * 60 + beM) - top, 42);
            return (
              <div className="appointment-block blocked-slot-block appointment-break-block" style={{ top, height }}>
                <div className="appointment-block-info">
                  <strong>{workHours.breakStart.slice(0, 5)} - {workHours.breakEnd.slice(0, 5)}</strong>
                  <span>Pausa</span>
                </div>
                <FiLock className="appointment-block-badge" />
              </div>
            );
          })()}

          {/* Menu que aparece ao soltar o arraste na grade, perguntando o que criar naquele intervalo */}
          {rangeMenu && (
            <>
              <div className="range-select-menu-backdrop" onClick={() => setRangeMenu(null)} />
              <div className="range-select-menu" style={{ top: rangeMenu.top }}>
                <span className="range-select-menu-time">
                  {minutesToTimeLabel(rangeMenu.startMinutes)} – {minutesToTimeLabel(rangeMenu.endMinutes)}
                </span>
                <button
                  className="range-select-menu-option"
                  onClick={() => {
                    openNewAppointmentForDay(rangeMenu.startMinutes);
                    setRangeMenu(null);
                  }}
                >
                  <FiPlus /> Agendamento
                </button>
                <button
                  className="range-select-menu-option range-select-menu-option-block"
                  onClick={() => {
                    openBlockPanelFromRange(rangeMenu.startMinutes, rangeMenu.endMinutes);
                    setRangeMenu(null);
                  }}
                >
                  <FiSlash /> Bloqueio
                </button>
                <button className="range-select-menu-close" aria-label="Fechar" onClick={() => setRangeMenu(null)}>
                  <FiX />
                </button>
              </div>
            </>
          )}

          {/* Novo agendamento: overlay escurece o fundo e o painel desliza a partir da direita */}
          <div
            className={`texture-appointment${isNewAppointmentOpen ? " open" : ""}`}
            onClick={closeNewAppointment}
          />
          <div className={`new-appointment${isNewAppointmentOpen ? " open" : ""}`}>
            <div className="new-appointment-header">
              <div className="new-appointment-header-left">
                {appointmentStep > 1 && (
                  <button className="new-appointment-back" onClick={goToPreviousStep} aria-label="Voltar">
                    <FiChevronLeft />
                  </button>
                )}
                <span>{(editingAppointmentId ? editAppointmentStepTitles : appointmentStepTitles)[appointmentStep]}</span>
              </div>
              <button className="new-appointment-close" onClick={closeNewAppointment}>
                <FiX />
              </button>
            </div>

            {/* Indicador de progresso das 4 etapas */}
            <div className="new-appointment-progress">
              {([1, 2, 3, 4] as AppointmentStep[]).map((s) => (
                <div
                  key={s}
                  className={`new-appointment-progress-step${appointmentStep >= s ? " done" : ""}${appointmentStep === s ? " current" : ""}`}
                >
                  <span className="new-appointment-progress-dot">
                    {appointmentStep > s ? <FiCheck /> : s}
                  </span>
                  <small>{["Cliente", "Serviço", "Horário", "Confirmar"][s - 1]}</small>
                </div>
              ))}
            </div>

            {/* Corpo do formulário, com scroll próprio caso o conteúdo cresça */}
            <div className="new-appointment-body">
              {appointmentError && <div className="new-appointment-error">{appointmentError}</div>}

              {/* ── Etapa 1: Cliente ── */}
              {appointmentStep === 1 && (
                <div className="new-appointment-field">
                  <div className="new-appointment-field-header">
                    <label>Cliente</label>
                    {!showNewCustomerForm && (
                      <button
                        type="button"
                        className="new-appointment-link-btn"
                        onClick={() => setShowNewCustomerForm(true)}
                      >
                        <FiPlus /> Novo cliente
                      </button>
                    )}
                  </div>

                  {!showNewCustomerForm ? (
                    <div className="customer-picker">
                      <input
                        type="text"
                        className="customer-picker-search"
                        placeholder="Buscar por nome ou telefone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <div className="customer-picker-list">
                        {(() => {
                          const query = customerSearch.trim().toLowerCase();
                          const filtered = query
                            ? customers.filter(
                                (c) =>
                                  c.name.toLowerCase().includes(query) ||
                                  c.phone?.toLowerCase().includes(query)
                              )
                            : customers;

                          if (filtered.length === 0) {
                            return <p className="customer-picker-empty">Nenhum cliente encontrado</p>;
                          }

                          return filtered.map((customer) => {
                            const active = selectedCustomerId === String(customer.id);
                            return (
                              <button
                                type="button"
                                key={customer.id}
                                className={`customer-picker-item${active ? " customer-picker-item-active" : ""}`}
                                onClick={() => setSelectedCustomerId(String(customer.id))}
                              >
                                <span className="customer-picker-avatar">{getInitials(customer.name)}</span>
                                <span className="customer-picker-info">
                                  <strong>{customer.name}</strong>
                                  {customer.phone && <span>{customer.phone}</span>}
                                </span>
                                {active && <FiCheck className="customer-picker-check" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="new-appointment-inline-form">
                      {newCustomerError && <div className="new-appointment-error">{newCustomerError}</div>}

                      <div className="new-appointment-field">
                        <label>Nome *</label>
                        <input
                          type="text"
                          placeholder="Nome completo"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="new-appointment-row">
                        <div className="new-appointment-field">
                          <label>Telefone</label>
                          <input
                            type="tel"
                            placeholder="(00) 00000-0000"
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(formatPhone(e.target.value))}
                          />
                        </div>
                        <div className="new-appointment-field">
                          <label>Documento</label>
                          <input
                            type="text"
                            placeholder="CPF/CNPJ"
                            value={newCustomerDocument}
                            onChange={(e) => setNewCustomerDocument(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="new-appointment-field">
                        <label>Email</label>
                        <input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                        />
                      </div>

                      <div className="new-appointment-field">
                        <label>Observações</label>
                        <textarea
                          placeholder="Preferências, alergias, etc..."
                          rows={2}
                          value={newCustomerNotes}
                          onChange={(e) => setNewCustomerNotes(e.target.value)}
                        />
                      </div>

                      <div className="new-appointment-inline-form-actions">
                        <button
                          type="button"
                          className="btn-clear-filters"
                          onClick={resetNewCustomerForm}
                          disabled={creatingCustomer}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn-apply-filters"
                          onClick={handleQuickCreateCustomer}
                          disabled={creatingCustomer}
                        >
                          {creatingCustomer ? "Salvando..." : "Salvar cliente"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Etapa 2: Serviço ── */}
              {appointmentStep === 2 && (
                <div className="new-appointment-field">
                  <label>Serviço</label>
                  <div className="service-picker-list">
                    {services.length === 0 ? (
                      <p className="customer-picker-empty">Nenhum serviço cadastrado</p>
                    ) : (
                      services.map((service) => {
                        const active = selectedServiceId === String(service.id);
                        const priceLabel = new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(service.price));
                        return (
                          <button
                            type="button"
                            key={service.id}
                            className={`service-picker-item${active ? " service-picker-item-active" : ""}`}
                            onClick={() => handleServiceChange(String(service.id))}
                          >
                            <span className="service-picker-info">
                              <strong>{service.title}</strong>
                              <span>{service.duration} min · {priceLabel}</span>
                            </span>
                            {active && <FiCheck className="customer-picker-check" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── Etapa 3: Data, horário e domicílio ── */}
              {appointmentStep === 3 && (
                <>
                  <div className="new-appointment-row">
                    <div className="new-appointment-field">
                      <label>Data</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                      />
                    </div>
                    <div className="new-appointment-field">
                      <label>Horário</label>
                      <input
                        type="time"
                        step={stepMinutes * 60}
                        value={appointmentTime}
                        onChange={(e) => handleAppointmentTimeChange(e.target.value)}
                      />
                      <small className="new-appointment-field-hint">
                        Horários de {stepMinutes} em {stepMinutes} min
                      </small>
                    </div>
                  </div>

                  {/* Duração e valor já vêm do cadastro do serviço — só exibidos aqui como referência, sem edição */}
                  <div className="new-appointment-service-info">
                    <span><strong>{duration} min</strong> de duração</span>
                    <span><strong>R$ {price || "0,00"}</strong></span>
                  </div>

                  {/* Atendimento a domicílio: define se o profissional vai até o cliente ou o atendimento é no local de sempre */}
                  <label className="new-appointment-checkbox">
                    <input
                      type="checkbox"
                      checked={isHomeService}
                      onChange={(e) => {
                        setIsHomeService(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedAddressId("");
                          setShowAddressForm(false);
                        }
                      }}
                    />
                    Atendimento a domicílio
                  </label>

                  {isHomeService && (
                    <div className="new-appointment-address-box">
                      {!selectedCustomerId && (
                        <p className="new-appointment-address-hint">Selecione o cliente para ver os endereços dele.</p>
                      )}

                      {!showAddressForm && addresses.length > 0 && (
                        <>
                          <div className="new-appointment-field">
                            <label>Endereço do cliente</label>
                            <select
                              value={selectedAddressId}
                              onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                            >
                              {addresses.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.street}, {a.number} — {a.neighborhood}, {a.city}/{a.state}
                                  {a.isPrimary ? " (principal)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="new-appointment-address-add"
                            onClick={() => setShowAddressForm(true)}
                          >
                            <FiPlus /> Cadastrar outro endereço
                          </button>
                        </>
                      )}

                      {showAddressForm && (
                        <>
                          <div className="new-appointment-row">
                            <div className="new-appointment-field">
                              <label>CEP</label>
                              <input
                                value={addressForm.cep}
                                onChange={(e) => setAddressForm((p) => ({ ...p, cep: formatCEP(e.target.value) }))}
                                placeholder="00000-000"
                              />
                              {cepStatus && (
                                <small className={`new-appointment-cep-status new-appointment-cep-${cepStatus.type}`}>
                                  {cepStatus.message}
                                </small>
                              )}
                            </div>
                            <div className="new-appointment-field">
                              <label>Número</label>
                              <input
                                value={addressForm.number}
                                onChange={(e) => setAddressForm((p) => ({ ...p, number: e.target.value }))}
                                placeholder="123"
                              />
                            </div>
                          </div>
                          <div className="new-appointment-field">
                            <label>Rua</label>
                            <input
                              value={addressForm.street}
                              onChange={(e) => setAddressForm((p) => ({ ...p, street: e.target.value }))}
                              placeholder="Rua / Avenida"
                            />
                          </div>
                          <div className="new-appointment-row">
                            <div className="new-appointment-field">
                              <label>Bairro</label>
                              <input
                                value={addressForm.neighborhood}
                                onChange={(e) => setAddressForm((p) => ({ ...p, neighborhood: e.target.value }))}
                                placeholder="Bairro"
                              />
                            </div>
                            <div className="new-appointment-field">
                              <label>Cidade</label>
                              <input
                                value={addressForm.city}
                                onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                                placeholder="Cidade"
                              />
                            </div>
                          </div>
                          <div className="new-appointment-field">
                            <label>UF</label>
                            <input
                              maxLength={2}
                              value={addressForm.state}
                              onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                              placeholder="SP"
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-apply-filters"
                            disabled={savingAddress}
                            onClick={handleCreateAddress}
                          >
                            {savingAddress ? "Salvando..." : "Salvar endereço"}
                          </button>
                          {addresses.length > 0 && (
                            <button
                              type="button"
                              className="new-appointment-address-add"
                              onClick={() => setShowAddressForm(false)}
                            >
                              Usar um endereço existente
                            </button>
                          )}
                        </>
                      )}

                      {/* Estimativa de deslocamento (Google Routes API) pro endereço escolhido */}
                      {!showAddressForm && selectedAddressId && (
                        <div className="new-appointment-travel-estimate">
                          {loadingTravelEstimate && <span>Calculando deslocamento...</span>}
                          {!loadingTravelEstimate && travelEstimate?.unavailable && (
                            <span>Não foi possível calcular o deslocamento pra esse endereço agora.</span>
                          )}
                          {!loadingTravelEstimate && travelEstimate && !travelEstimate.unavailable && travelEstimate.exceedsMaxDistance && (
                            <span className="new-appointment-travel-warning">
                              Endereço fora do raio de atendimento a domicílio (máximo {travelEstimate.maxDistanceKm} km).
                            </span>
                          )}
                          {!loadingTravelEstimate && travelEstimate && !travelEstimate.unavailable && !travelEstimate.exceedsMaxDistance && (
                            <>
                              <span>
                                Custo de deslocamento (ida e volta): <strong>R$ {travelEstimate.cost.toFixed(2).replace(".", ",")}</strong>
                                {travelEstimate.km != null && ` · ${travelEstimate.km.toFixed(1)} km`}
                                {travelEstimate.minutes > 0 && ` · ${travelEstimate.minutes} min (ida)`}
                              </span>
                              <span className="new-appointment-travel-total">
                                Tempo total ocupado na agenda: <strong>{Number(duration || 0) + travelEstimate.minutes * 2} min</strong>
                                {" "}({duration} min de atendimento + {travelEstimate.minutes * 2} min de deslocamento)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Etapa 4: Pagamento, observações e resumo ── */}
              {appointmentStep === 4 && (
                <>
                  <div className="new-appointment-summary">
                    <div className="new-appointment-summary-row">
                      <small>Cliente</small>
                      <strong>{customers.find((c) => String(c.id) === selectedCustomerId)?.name}</strong>
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Serviço</small>
                      <strong>{services.find((s) => String(s.id) === selectedServiceId)?.title}</strong>
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Quando</small>
                      <strong>{appointmentDate} às {appointmentTime}</strong>
                    </div>
                    {isHomeService && travelEstimate && !travelEstimate.unavailable && !travelEstimate.exceedsMaxDistance && (
                      <div className="new-appointment-summary-row">
                        <small>Tempo total ocupado na agenda</small>
                        <strong>{Number(duration || 0) + travelEstimate.minutes * 2} min</strong>
                      </div>
                    )}
                    {isHomeService && (
                      <div className="new-appointment-summary-row">
                        <small>Domicílio</small>
                        <strong>
                          {(() => {
                            const addr = addresses.find((a) => a.id === selectedAddressId);
                            return addr ? `${addr.street}, ${addr.number}` : "Endereço do cliente";
                          })()}
                        </strong>
                      </div>
                    )}
                    {isHomeService && travelEstimate && !travelEstimate.unavailable && !travelEstimate.exceedsMaxDistance && (
                      <div className="new-appointment-summary-row">
                        <small>Deslocamento (ida e volta)</small>
                        <strong>
                          R$ {travelEstimate.cost.toFixed(2).replace(".", ",")}
                          {travelEstimate.km != null && ` (${travelEstimate.km.toFixed(1)} km)`}
                        </strong>
                      </div>
                    )}
                    {isHomeService && travelEstimate && !travelEstimate.unavailable && !travelEstimate.exceedsMaxDistance && (
                      <div className="new-appointment-summary-row">
                        <small>Total</small>
                        <strong>
                          R$ {(Number(price || 0) + travelEstimate.cost).toFixed(2).replace(".", ",")}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="new-appointment-field">
                    <label>Status do pagamento</label>
                    <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                      <option value="paid">Pago</option>
                      <option value="unpaid">Não pago</option>
                    </select>
                  </div>

                  <div className="new-appointment-field">
                    <label>Observações</label>
                    <textarea
                      placeholder="Alguma observação sobre o agendamento"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Ações fixas na base do painel */}
            <div className="new-appointment-footer">
              <button className="btn-clear-filters" onClick={closeNewAppointment}>
                Cancelar
              </button>
              {appointmentStep < 4 ? (
                <button className="btn-apply-filters" onClick={goToNextStep}>
                  Continuar
                </button>
              ) : (
                <button
                  className="btn-apply-filters"
                  disabled={savingAppointment}
                  onClick={handleSaveAppointment}
                >
                  {savingAppointment ? "Salvando..." : editingAppointmentId ? "Salvar edição" : "Salvar"}
                </button>
              )}
            </div>
          </div>

          {/* Bloquear horário: pega a hora clicada como início, o usuário só define o horário final */}
          <div
            className={`texture-appointment${isBlockOpen ? " open" : ""}`}
            onClick={closeBlockPanel}
          />
          <div className={`new-appointment${isBlockOpen ? " open" : ""}`}>
            <div className="new-appointment-header">
              <span>Bloquear horário</span>
              <button className="new-appointment-close" onClick={closeBlockPanel}>
                <FiX />
              </button>
            </div>

            <div className="new-appointment-body">
              {blockError && <div className="new-appointment-error">{blockError}</div>}

              <div className="new-appointment-row">
                <div className="new-appointment-field">
                  <label>Início</label>
                  <input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} />
                </div>
                <div className="new-appointment-field">
                  <label>Fim</label>
                  <input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} />
                </div>
              </div>

              <div className="new-appointment-field">
                <label>Motivo (opcional)</label>
                <input
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="Almoço, folga, indisponível..."
                />
              </div>
            </div>

            <div className="new-appointment-footer">
              <button className="btn-clear-filters" onClick={closeBlockPanel}>
                Cancelar
              </button>
              <button className="btn-apply-filters" disabled={savingBlock} onClick={handleCreateBlock}>
                {savingBlock ? "Salvando..." : "Bloquear"}
              </button>
            </div>
          </div>

          {/* Detalhes de um bloqueio já existente: abre ao clicar num bloco de bloqueio na grade */}
          <div
            className={`texture-appointment${selectedBlockedSlot ? " open" : ""}`}
            onClick={() => setSelectedBlockedSlot(null)}
          />
          {selectedBlockedSlot && (() => {
            const block = selectedBlockedSlot;
            const start = new Date(block.startAt);
            const end = new Date(block.endAt);
            const formatUTC = (d: Date) =>
              d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
            const dateLabel = start.toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
            });

            return (
              <div className="new-appointment open appointment-details-modal">
                <div className="new-appointment-header">
                  <span>Detalhes do bloqueio</span>
                  <button className="new-appointment-close" onClick={() => setSelectedBlockedSlot(null)}>
                    <FiX />
                  </button>
                </div>

                <div className="new-appointment-body">
                  <div className="new-appointment-summary">
                    <div className="new-appointment-summary-row">
                      <small>Motivo</small>
                      <strong>{block.title}</strong>
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Quando</small>
                      <strong style={{ textTransform: "capitalize" }}>{dateLabel}</strong>
                      <span>{formatUTC(start)} – {formatUTC(end)}</span>
                    </div>
                  </div>
                </div>

                <div className="new-appointment-footer appointment-details-actions">
                  <button
                    className="btn-clear-filters appointment-details-cancel"
                    disabled={deletingBlockedSlot}
                    onClick={() => {
                      if (window.confirm("Remover este bloqueio?")) {
                        handleDeleteBlockedSlot(block.id);
                      }
                    }}
                  >
                    {deletingBlockedSlot ? "Removendo..." : "Remover bloqueio"}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Detalhes do agendamento: abre ao clicar num bloco já existente na grade */}
          <div
            className={`texture-appointment${selectedAppointment ? " open" : ""}`}
            onClick={() => setSelectedAppointment(null)}
          />
          {selectedAppointment && (() => {
            const appt = selectedAppointment;
            const customer = customers.find((c) => c.id === appt.customerId);
            const service = services.find((s) => s.id === appt.serviceId);
            const scheduled = new Date(appt.scheduledAt);
            const endDate = new Date(scheduled.getTime() + appt.duration * 60000);
            const formatUTC = (d: Date) =>
              d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
            const dateLabel = scheduled.toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
            });
            const priceLabel = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
              .format(Number(appt.price));
            const isPastAppointment = endDate.getTime() < nowWallClockMs();

            return (
              <div className="new-appointment open appointment-details-modal">
                <div className="new-appointment-header">
                  <span>Detalhes do agendamento</span>
                  <button className="new-appointment-close" onClick={() => setSelectedAppointment(null)}>
                    <FiX />
                  </button>
                </div>

                <div className="new-appointment-body">
                  <div
                    className="appointment-details-status"
                    style={{ backgroundColor: statusColors[appt.status] ?? "#767676" }}
                  >
                    {statusLabels[appt.status] ?? appt.status}
                  </div>

                  <div className="new-appointment-summary">
                    <div className="new-appointment-summary-row">
                      <small>Cliente</small>
                      <strong>{customer?.name ?? `Cliente #${appt.customerId}`}</strong>
                      {customer?.phone && <span>{customer.phone}</span>}
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Serviço</small>
                      <strong>{service?.title ?? `Serviço #${appt.serviceId}`}</strong>
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Quando</small>
                      <strong style={{ textTransform: "capitalize" }}>{dateLabel}</strong>
                      <span>{formatUTC(scheduled)} – {formatUTC(endDate)} ({appt.duration} min)</span>
                    </div>
                    <div className="new-appointment-summary-row">
                      <small>Valor</small>
                      <strong>{priceLabel}</strong>
                    </div>
                    {appt.isHomeService && (
                      <div className="new-appointment-summary-row">
                        <small>Domicílio</small>
                        <strong>🏠 Atendimento no endereço do cliente</strong>
                      </div>
                    )}
                    {appt.isHomeService && Number(appt.travelCost) > 0 && (
                      <div className="new-appointment-summary-row">
                        <small>Deslocamento (ida e volta)</small>
                        <strong>
                          R$ {Number(appt.travelCost).toFixed(2).replace(".", ",")}
                          {appt.travelDistanceKm != null && ` (${Number(appt.travelDistanceKm).toFixed(1)} km)`}
                        </strong>
                      </div>
                    )}
                    {appt.isHomeService && !!appt.travelMinutes && (() => {
                      const freeAt = new Date(scheduled.getTime() + (appt.duration + appt.travelMinutes * 2) * 60000);
                      return (
                        <div className="new-appointment-summary-row">
                          <small>Agenda livre a partir de</small>
                          <strong>{formatUTC(freeAt)}</strong>
                          <span>({appt.duration} min de atendimento + {appt.travelMinutes * 2} min de deslocamento ida e volta)</span>
                        </div>
                      );
                    })()}
                    {appt.notes && (
                      <div className="new-appointment-summary-row">
                        <small>Observações</small>
                        <strong>{appt.notes}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {!isPastAppointment && !["completed", "cancelled", "no_show"].includes(appt.status) ? (
                  <div className="new-appointment-footer appointment-details-actions">
                    <button
                      className="btn-clear-filters appointment-details-cancel"
                      disabled={updatingAppointmentStatus}
                      onClick={() => {
                        if (window.confirm("Cancelar este agendamento?")) {
                          updateAppointmentStatus(appt.id, "cancelled");
                        }
                      }}
                    >
                      Cancelar agendamento
                    </button>
                    <button
                      className="btn-clear-filters"
                      disabled={updatingAppointmentStatus}
                      onClick={() => openEditAppointment(appt)}
                    >
                      Editar agendamento
                    </button>
                    <button
                      className="btn-apply-filters"
                      disabled={updatingAppointmentStatus}
                      onClick={() => updateAppointmentStatus(appt.id, "completed")}
                    >
                      {updatingAppointmentStatus ? "Concluindo..." : "Concluir agora / Chamar próximo"}
                    </button>
                  </div>
                ) : (
                  <div className="new-appointment-footer">
                    <button className="btn-clear-filters" onClick={() => setSelectedAppointment(null)}>
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        {/* Main do calendar */}
      </div>
    </div>
  );
}
export default Calendar;
