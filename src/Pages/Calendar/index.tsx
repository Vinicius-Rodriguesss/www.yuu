import { useState, useEffect, useCallback, useRef } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiClock,
  FiUser,
  FiMoreHorizontal,
  FiCalendar,
  FiList,
  FiSearch,
  FiFilter,
  FiX,
  FiCheckCircle,
  FiCircle,
  FiDollarSign,
  FiScissors,
  FiAlertCircle,
} from "react-icons/fi";

// =============================================================
// Tipos
// =============================================================

interface Appointment {
  id: number;
  clientName: string;
  service: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  duration: number; // minutos
  value: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  phone?: string;
  notes?: string;
}

interface WeekDay {
  date: Date;
  isToday: boolean;
  appointments: Appointment[];
}

type StatusFilter = "all" | Appointment["status"];

// =============================================================
// Camada de API
// =============================================================
// Aponte direto para a URL do seu backend.
const API_BASE_URL = "http://localhost:3000/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? `Erro ${response.status}`, response.status);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

// Contrato esperado do endpoint:
// GET /appointments?start=YYYY-MM-DD&end=YYYY-MM-DD
// -> Appointment[]
// (o back filtra pelo intervalo de datas da semana visível; busca e status
// filtramos no client por enquanto)
async function fetchAppointments(start: string, end: string): Promise<Appointment[]> {
  return apiFetch<Appointment[]>(`/appointments?start=${start}&end=${end}`);
}

// PATCH /appointments/:id/status  { status }
async function updateAppointmentStatus(
  id: number,
  status: Appointment["status"]
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// =============================================================
// Constantes / helpers de UI
// =============================================================

const serviceColors: Record<string, string> = {
  "Corte Masculino": "#4F46E5",
  "Corte Feminino": "#EC4899",
  Barba: "#8B5CF6",
  Hidratação: "#06B6D4",
  Coloração: "#F59E0B",
  Manicure: "#10B981",
  Pedicure: "#6366F1",
  Massagem: "#EF4444",
};

const getServiceColor = (service: string): string => {
  for (const [key, color] of Object.entries(serviceColors)) {
    if (service.includes(key)) return color;
  }
  return "#6B7280";
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const WEEKDAYS_HEADER = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Altura (em px) de 1 hora na grade. 24 horas * 68px = 1632px de grade total.
const HOUR_HEIGHT = 68;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const formatDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const getStatusBadge = (status: Appointment["status"]) => {
  const config = {
    confirmed: { bg: "bg-green-50", text: "text-green-700", label: "Confirmado", icon: FiCheckCircle },
    pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pendente", icon: FiCircle },
    completed: { bg: "bg-blue-50", text: "text-blue-700", label: "Realizado", icon: FiCheckCircle },
    cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelado", icon: FiX },
  };
  return config[status];
};

// Retorna os 7 dias (Dom -> Sáb) da semana que contém `date`.
const getWeekDays = (date: Date): Date[] => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

// Deslocamento vertical (em px) do início do agendamento dentro da grade de 24h.
const getTopOffset = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
};

const getBlockHeight = (duration: number): number =>
  Math.max((duration / 60) * HOUR_HEIGHT, 28);

// =============================================================
// Componente
// =============================================================

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const mobileGridScrollRef = useRef<HTMLDivElement>(null);

  const weekDays = getWeekDays(currentDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointments(formatDateStr(weekStart), formatDateStr(weekEnd));
      setAppointments(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os agendamentos. Verifique sua conexão."
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.getTime(), weekEnd.getTime()]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Rola a grade automaticamente até um pouco antes do horário atual/comercial.
  useEffect(() => {
    if (!loading) {
      const now = new Date();
      const scrollHour = isSameDay(now, currentDate) || weekDays.some((d) => isSameDay(d, now))
        ? Math.max(now.getHours() - 1, 0)
        : 7;
      if (gridScrollRef.current) gridScrollRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
      if (mobileGridScrollRef.current) mobileGridScrollRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateStr = formatDateStr(date);
    return appointments.filter((app) => app.date === dateStr);
  };

  const filteredAppointments = appointments.filter((app) => {
    const matchesSearch =
      app.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const weekDaysData: WeekDay[] = weekDays.map((date) => ({
    date,
    isToday: isSameDay(date, new Date()),
    appointments: getAppointmentsForDate(date).filter((app) => filteredAppointments.includes(app)),
  }));

  const listAppointments = selectedDate
    ? filteredAppointments.filter((app) => app.date === formatDateStr(selectedDate))
    : filteredAppointments;

  const groupedAppointments = listAppointments.reduce((acc, app) => {
    if (!acc[app.date]) acc[app.date] = [];
    acc[app.date].push(app);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const sortedDates = Object.keys(groupedAppointments).sort();

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppointment) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateAppointmentStatus(selectedAppointment.id, "confirmed");
      setAppointments((prev) =>
        prev.map((app) => (app.id === updated.id ? updated : app))
      );
      setSelectedAppointment(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível atualizar o agendamento."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Rótulo do período exibido no topo (ex: "13 - 19 de Julho, 2026" ou
  // "28 Jun - 4 Jul, 2026" quando a semana cruza dois meses).
  const rangeLabel = (() => {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
    if (sameMonth) {
      return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${MONTHS[weekStart.getMonth()]}, ${weekStart.getFullYear()}`;
    }
    if (sameYear) {
      return `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTHS_SHORT[weekEnd.getMonth()]}, ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()} - ${weekEnd.getDate()} ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  })();

  if (loading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Calendário</h1>
        <p className="text-sm text-gray-400">Gerencie seus agendamentos e horários</p>
      </div>

      {/* Erro de API */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
          <FiAlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button
            onClick={loadAppointments}
            className="font-medium underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateWeek(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500"
            >
              <FiChevronLeft size={20} />
            </button>
            <span className="text-sm sm:text-base font-semibold text-gray-900 min-w-[160px] sm:min-w-[220px] text-center">
              {rangeLabel}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente ou serviço..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-all ${showFilters || statusFilter !== "all"
                  ? "border-gray-900 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
            >
              <FiFilter size={16} />
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
                {(
                  [
                    { value: "all", label: "Todos" },
                    { value: "confirmed", label: "Confirmados" },
                    { value: "pending", label: "Pendentes" },
                    { value: "completed", label: "Realizados" },
                    { value: "cancelled", label: "Cancelados" },
                  ] as { value: StatusFilter; label: string }[]
                ).map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setStatusFilter(filter.value);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${statusFilter === filter.value
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-all">
            <FiPlus size={14} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* Grid principal */}
      <div className="  gap-6">
        {/* Calendário */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          {/* ---------------------------------------------------------- */}
          {/* MOBILE: seletor de dia (scroll horizontal) + agenda do dia  */}
          {/* ---------------------------------------------------------- */}
          <div className="md:hidden">
            <div className="flex gap-1.5 px-2 py-3 overflow-x-auto scrollbar-thin border-b border-gray-100">
              {weekDaysData.map(({ date, isToday }, index) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    className={`flex flex-col items-center gap-1.5 flex-shrink-0 w-14 py-2 rounded-xl transition-colors ${isSelected ? "bg-gray-900" : "hover:bg-gray-50"
                      }`}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? "text-gray-300" : "text-gray-400"
                        }`}
                    >
                      {WEEKDAYS_HEADER[index].slice(0, 3)}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 text-base font-semibold rounded-full ${isSelected
                          ? "bg-white text-gray-900"
                          : isToday
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700"
                        }`}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-base font-semibold text-gray-900">
                {selectedDate
                  ? `${WEEKDAYS_HEADER[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`
                  : "Selecione um dia"}
              </p>
            </div>

            <div ref={mobileGridScrollRef} className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 420px)" }}>
              <div className="flex relative" style={{ height: HOUR_HEIGHT * 24 }}>
                {/* Coluna de horários — maior e mais legível no mobile */}
                <div className="w-16 mt-10 flex-shrink-0 border-r border-gray-100 relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 text-right pr-2.5 -translate-y-1/2"
                      style={{ top: hour * HOUR_HEIGHT }}
                    >
                      <span className="text-xs text-gray-500 font-semibold">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Coluna única do dia selecionado */}
                {(() => {
                  const mobileDate = selectedDate ?? new Date();
                  const mobileDay =
                    weekDaysData.find((d) => isSameDay(d.date, mobileDate)) ?? {
                      date: mobileDate,
                      isToday: isSameDay(mobileDate, new Date()),
                      appointments: getAppointmentsForDate(mobileDate).filter((app) =>
                        filteredAppointments.includes(app)
                      ),
                    };
                  return (
                    <div className="flex-1 relative">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-gray-50"
                          style={{ top: hour * HOUR_HEIGHT }}
                        />
                      ))}

                      {mobileDay.isToday && (
                        <div
                          className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                          style={{
                            top:
                              new Date().getHours() * HOUR_HEIGHT +
                              (new Date().getMinutes() / 60) * HOUR_HEIGHT,
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-px bg-red-500" />
                        </div>
                      )}

                      {mobileDay.appointments.map((app) => {
                        const color = getServiceColor(app.service);
                        return (
                          <div
                            key={app.id}
                            onClick={() => handleAppointmentClick(app)}
                            className="absolute left-1.5 right-1.5 rounded-lg px-2.5 py-1.5 cursor-pointer overflow-hidden active:brightness-95 transition-all"
                            style={{
                              top: getTopOffset(app.time),
                              height: getBlockHeight(app.duration),
                              backgroundColor: `${color}18`,
                              borderLeft: `3px solid ${color}`,
                            }}
                          >
                            <p className="text-sm font-semibold truncate" style={{ color }}>
                              {formatTime(app.time)} · {app.clientName.split(" ")[0]}
                            </p>
                            {getBlockHeight(app.duration) > 40 && (
                              <p className="text-xs text-gray-500 truncate">{app.service}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* DESKTOP/TABLET: semana completa (7 colunas) + grade de 24h  */}
          {/* ---------------------------------------------------------- */}
          <div className="hidden md:flex md:flex-col">
            {/* Cabeçalho dos dias da semana (horizontal) */}
            <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
              {/* Espaço reservado para a coluna de horários */}
              <div className="w-20 flex-shrink-0 border-r border-gray-100" />


              {weekDaysData.map(({ date, isToday }, index) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    className={`flex-1 py-3 flex flex-col items-center gap-1.5 border-r border-gray-50 last:border-r-0 transition-colors hover:bg-gray-50/50 ${isSelected ? "bg-gray-50" : ""
                      }`}
                  >
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${index === 0 || index === 6 ? "text-gray-400" : "text-gray-500"
                        }`}
                    >
                      {WEEKDAYS_HEADER[index].slice(0, 3)}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 text-base font-semibold rounded-full ${isToday
                          ? "bg-gray-900 text-white"
                          : isSelected
                            ? "text-gray-900 font-semibold"
                            : "text-gray-700"
                        }`}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grade de horários (vertical, 24h) com colunas de dias */}
            <div ref={gridScrollRef} className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 340px)" }}>
              <div className="flex relative" style={{ height: HOUR_HEIGHT * 24 }}>
                {/* Coluna de horários */}
                <div className="w-20 flex-shrink-0 border-r border-gray-100 relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute mt-15 mb-15 left-0 right-0 text-right pr-3 -translate-y-1/2"
                      style={{ top: hour * HOUR_HEIGHT }}
                    >
                      <span className="text-xs text-gray-500 font-semibold">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Colunas dos dias */}
                {weekDaysData.map(({ date, isToday, appointments: dayApps }, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="flex-1 relative border-r border-gray-50 last:border-r-0"
                  >
                    {/* Linhas horizontais de cada hora */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-gray-50"
                        style={{ top: hour * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Marcador do horário atual */}
                    {isToday && (
                      <div
                        className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                        style={{
                          top:
                            new Date().getHours() * HOUR_HEIGHT +
                            (new Date().getMinutes() / 60) * HOUR_HEIGHT,
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    )}

                    {/* Blocos de agendamento */}
                    {dayApps.map((app) => {
                      const color = getServiceColor(app.service);
                      return (
                        <div
                          key={app.id}
                          onClick={() => handleAppointmentClick(app)}
                          className="absolute left-0.5 right-0.5 rounded-md px-2 py-1 cursor-pointer overflow-hidden transition-all hover:brightness-95 hover:z-20"
                          style={{
                            top: getTopOffset(app.time),
                            height: getBlockHeight(app.duration),
                            backgroundColor: `${color}18`,
                            borderLeft: `2px solid ${color}`,
                          }}
                        >
                          <p className="text-xs font-semibold truncate" style={{ color }}>
                            {formatTime(app.time)} · {app.clientName.split(" ")[0]}
                          </p>
                          {getBlockHeight(app.duration) > 36 && (
                            <p className="text-[11px] text-gray-500 truncate">{app.service}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Modal de detalhes do agendamento */}
      {showAppointmentModal && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAppointmentModal(false)}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 rounded-t-xl"
              style={{ backgroundColor: `${getServiceColor(selectedAppointment.service)}10` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getServiceColor(selectedAppointment.service) }}
                  />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {selectedAppointment.service}
                  </span>
                </div>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
                >
                  <FiX size={16} className="text-gray-500" />
                </button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedAppointment.clientName}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={12} />
                  {formatDateDisplay(selectedAppointment.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiClock size={12} />
                  {formatTime(selectedAppointment.time)} ({selectedAppointment.duration}min)
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  {(() => {
                    const badge = getStatusBadge(selectedAppointment.status);
                    const Icon = badge.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <Icon size={12} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Valor</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedAppointment.value)}</p>
                </div>
              </div>

              {selectedAppointment.phone && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Telefone</p>
                  <p className="text-sm text-gray-700 flex items-center gap-2">
                    <FiUser size={13} className="text-gray-400" />
                    {selectedAppointment.phone}
                  </p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  Editar
                </button>
                <button
                  onClick={handleConfirmAppointment}
                  disabled={updatingStatus || selectedAppointment.status === "confirmed"}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;