import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiCheck, FiDollarSign, FiX, FiPlus } from "react-icons/fi";
import { apiFetch, tzOffsetMin } from "@/api/client";
import { formatCEP, type ViaCEPResponse } from "@/SignUp/passwordValidation";
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



const Calendar = () => {
  // Controla se o painel "Destacar Agendamentos" está expandido ou recolhido
  const [highlightOpen, setHighlightOpen] = useState(true);

  // Estado dos filtros de pagamento (Pago / Não pago)
  const [paidFilter, setPaidFilter] = useState(false);
  const [unpaidFilter, setUnpaidFilter] = useState(false);

  // Estado do filtro de status da reserva (Confirmada / Não confirmada)
  const [confirmedFilter, setConfirmedFilter] = useState(false);
  const [unconfirmedFilter, setUnconfirmedFilter] = useState(false);

  // Reseta todos os filtros do painel
  const handleClearFilters = () => {
    setPaidFilter(false);
    setUnpaidFilter(false);
    setConfirmedFilter(false);
    setUnconfirmedFilter(false);
  };

  // Referência de cada linha de hora, usada para calcular a posição real (em px) do horário atual
  const hourRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Referência da área com scroll do calendário, para centralizar o scroll no horário atual ao carregar
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToNowRef = useRef(false);

  // Posição (topo, em px) e texto (HH:mm) da linha que indica o horário atual
  const [nowTop, setNowTop] = useState<number | null>(null);
  const [nowLabel, setNowLabel] = useState("");

  useEffect(() => {
    // Calcula a posição da linha com base na altura real da linha da hora atual + fração dos minutos já passados
    const updateNowLine = () => {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const row = hourRowRefs.current[hour];

      if (row) {
        setNowTop(row.offsetTop + (minutes / 60) * row.offsetHeight);
      }
      setNowLabel(`${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Clientes e serviços já cadastrados no backend, usados para preencher os selects do formulário
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Campos do formulário de novo agendamento
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
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

  const loadAppointments = () => {
    apiFetch(`/appointments?date=${dayKey(selectedDay)}`)
      .then(setAppointments)
      .catch(() => setAppointments([]));
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Jornada de trabalho real do dia selecionado (definida pelo usuário no cadastro), não mais fixa
  const [workHours, setWorkHours] = useState<{ isWorkDay: boolean; workStart: string | null; workEnd: string | null } | null>(null);

  useEffect(() => {
    apiFetch(`/availability?date=${dayKey(selectedDay)}&tz=${tzOffsetMin}`)
      .then((data) => setWorkHours({ isWorkDay: data.isWorkDay, workStart: data.workStart, workEnd: data.workEnd }))
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
  }, [appointments]);

  // Converte "minutos desde 00:00" em posição vertical (px), interpolando dentro da hora correspondente
  const minutesToOffsetPx = (totalMinutes: number) => {
    const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60));
    const hour = Math.min(Math.floor(clamped / 60), 23);
    const fraction = (clamped - hour * 60) / 60;
    const start = hourOffsets[hour] ?? 0;
    const end = hourOffsets[hour + 1] ?? start;
    return start + fraction * (end - start);
  };

  // Horas cobertas por algum agendamento — nelas o placeholder "Novo Agendamento" não pode aparecer,
  // senão ele fica visível por baixo/atrás do bloco do agendamento real
  const occupiedHours = new Set<number>();
  appointments.forEach((appt) => {
    const scheduled = new Date(appt.scheduledAt);
    const startMinutes = scheduled.getUTCHours() * 60 + scheduled.getUTCMinutes();
    const endMinutes = startMinutes + appt.duration;
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.ceil(endMinutes / 60);
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
          const primary = data.find((a) => a.isPrimary) ?? data[0];
          setSelectedAddressId(primary.id);
        }
      })
      .catch(() => setAddresses([]));
  }, [isHomeService, selectedCustomerId]);

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

  const resetAppointmentForm = () => {
    setSelectedCustomerId("");
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
    setAppointmentStep(1);
  };

  const closeNewAppointment = () => {
    setIsNewAppointmentOpen(false);
    resetAppointmentForm();
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

  const handleCreateAppointment = async () => {
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
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
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
        }),
      });
      closeNewAppointment();
      loadAppointments();
    } catch (error) {
      setAppointmentError(error instanceof Error ? error.message : "Erro ao criar agendamento");
    } finally {
      setSavingAppointment(false);
    }
  };

  return (
    <div className="container-calendar">
      {/* Calendar header */}
      <div className="header-calendar">
        <div className="header-content">
          <button onClick={() => changeSelectedDay(-1)} aria-label="Dia anterior"><FiChevronLeft /></button>
          <div className="header-content-text-container" onClick={() => selectDay(new Date())}>
            <div className="header-content-text">
              <span>{headerDayLabel}</span>
              <span>{workHoursLabel}</span>
            </div>
            <FiChevronDown />
          </div>
          <button onClick={() => changeSelectedDay(1)} aria-label="Próximo dia"><FiChevronRight /></button>
        </div>
      </div>
      <div className="main-calendar">
        {/* Main do calendar */}
        <div className="nav-calendar">
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
                <span key={dayKey(day)} className={classes} onClick={() => selectDay(day)}>
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

                {/* Ações do painel de filtros */}
                <div className="highlight-appointments-actions">
                  <button className="btn-clear-filters" onClick={handleClearFilters}>Limpar</button>
                  <button className="btn-apply-filters">Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
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

          {hours.map((hour) => (
            <div
              key={hour}
              className="calendar-hour"
              ref={(el) => { hourRowRefs.current[hour] = el; }}
            >
              <div className="calendar-hour-label">{String(hour).padStart(2, "0")}:00</div>

              {/* Line  */}
              <div className="container-tasks">
                <div className="calendar-hour-line"></div>
                {!occupiedHours.has(hour) && isHourWithinWorkHours(hour) && (
                  <button
                    className="task-default"
                    onClick={() => {
                      setAppointmentDate(dayKey(selectedDay));
                      setAppointmentTime(`${String(hour).padStart(2, "0")}:00`);
                      setIsNewAppointmentOpen(true);
                    }}
                  >
                    Novo Agendamento
                    <FiPlus />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Agendamentos reais do dia, desenhados por cima da grade — posição/altura calculadas a partir de scheduledAt + duration */}
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

            return (
              <div
                key={appt.id}
                className="appointment-block"
                style={{ top, height, backgroundColor: statusColors[appt.status] ?? "#767676" }}
                onClick={() => setSelectedAppointment(appt)}
              >
                <div className="appointment-block-info">
                  <strong>{formatUTC(scheduled)} - {formatUTC(endDate)}</strong>
                  <span>{customer?.name ?? `Cliente #${appt.customerId}`} · {service?.title ?? `Serviço #${appt.serviceId}`}</span>
                </div>
                {appt.isHomeService && <span className="appointment-block-badge">🏠</span>}
              </div>
            );
          })}


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
                <span>{appointmentStepTitles[appointmentStep]}</span>
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
                  <label>Cliente</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Selecione o cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}{customer.phone ? ` — ${customer.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Etapa 2: Serviço ── */}
              {appointmentStep === 2 && (
                <div className="new-appointment-field">
                  <label>Serviço</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                  >
                    <option value="">Selecione o serviço</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
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
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                      />
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
                  onClick={handleCreateAppointment}
                >
                  {savingAppointment ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>

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
                    {appt.notes && (
                      <div className="new-appointment-summary-row">
                        <small>Observações</small>
                        <strong>{appt.notes}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="new-appointment-footer">
                  <button className="btn-clear-filters" onClick={() => setSelectedAppointment(null)}>
                    Fechar
                  </button>
                </div>
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
