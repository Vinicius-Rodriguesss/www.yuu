import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiUser,
  FiX,
  FiDollarSign,
  FiLink,
  FiCheck,
} from "react-icons/fi";
import ClientSchedulingForm from "@/Components/CreatedCliente";
import { apiFetch, tzOffsetMin } from "@/api/client";
import "./index.css";

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Service {
  id: number;
  title: string;
}

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
  travelMinutes?: number;
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Finalizado",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

interface DaySlot {
  time: string;
  startAt: string;
  status: "available" | "occupied" | "blocked" | "past" | "unavailable";
  blockTitle?: string;
}

interface DayAvailability {
  isWorkDay: boolean;
  workStart: string | null;
  workEnd: string | null;
  interval: number;
  buffer: number;
  slots: DaySlot[];
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const weekDaysShort = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Chave yyyy-mm-dd das células da grade (datas construídas localmente)
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Chave yyyy-mm-dd de um horário vindo do backend ("hora de parede" no frame UTC)
const dayKeyISO = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Hora de parede: exibe exatamente o horário agendado, sem conversão de fuso
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const Calendar = () => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [panelOpen, setPanelOpen] = useState(false); // drawer (desktop)
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [dayAvailability, setDayAvailability] = useState<DayAvailability | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [appts, custs, servs] = await Promise.all([
        apiFetch("/appointments"),
        apiFetch("/customers"),
        apiFetch("/services"),
      ]);
      setAppointments(appts);
      setCustomers(custs);
      setServices(servs);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Disponibilidade do dia selecionado (timeline)
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/availability?date=${dayKey(selectedDay)}&tz=${tzOffsetMin}`)
      .then((data) => { if (!cancelled) setDayAvailability(data); })
      .catch(() => { if (!cancelled) setDayAvailability(null); });
    return () => { cancelled = true; };
  }, [selectedDay, appointments]);

  // Centraliza o dia selecionado na fita (mobile)
  useEffect(() => {
    const el = stripRef.current?.querySelector(".cal-strip-day.selected");
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedDay, viewDate]);

  const generateMeetingLink = async (appointmentId: number) => {
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/meeting-link`, {
        method: "POST",
      });
      const url = `${window.location.origin}${data.meetingPath}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopiedId(appointmentId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar link");
    }
  };

  // Agrupa agendamentos por dia, ordenados por horário
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    for (const appt of sorted) {
      const key = dayKeyISO(appt.scheduledAt);
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  // Semanas visíveis do mês (desktop)
  const cells = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  // Dias do mês (fita mobile)
  const stripDays = useMemo(() => {
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
    );
  }, [viewDate]);

  const customerOf = (id: number) => customers.find((c) => c.id === id);
  const serviceOf = (id: number) => services.find((s) => s.id === id);

  const changeMonth = (delta: number) =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));

  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  const todayKey = dayKey(today);
  const selectedKey = dayKey(selectedDay);
  const dayAppointments = byDay.get(selectedKey) ?? [];
  const activeDayAppts = dayAppointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "no_show"
  );
  const dayTotal = activeDayAppts.reduce((sum, a) => sum + Number(a.price), 0);

  const dayLabel = selectedDay.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ── Conteúdo do painel do dia (usado no drawer desktop e inline no mobile) ──
  const dayPanelBody = (
    <>
      {/* Timeline de disponibilidade */}
      {dayAvailability && dayAvailability.isWorkDay && (
        <div className="cal-timeline">
          <div className="cal-timeline-head">
            <span>Expediente {dayAvailability.workStart} – {dayAvailability.workEnd}</span>
            <span>grade de {dayAvailability.interval} min</span>
          </div>
          <div className="cal-timeline-slots">
            {dayAvailability.slots.map((slot) => (
              <span
                key={slot.time}
                className={`cal-tl cal-tl-${slot.status}`}
                title={`${slot.time} — ${
                  slot.status === "available" ? "Livre"
                  : slot.status === "occupied" ? "Ocupado"
                  : slot.status === "blocked" ? (slot.blockTitle ?? "Bloqueado")
                  : slot.status === "past" ? "Passado"
                  : "Indisponível"
                }`}
              />
            ))}
          </div>
          <div className="cal-timeline-legend">
            <span><i className="cal-tl cal-tl-available" /> Livre</span>
            <span><i className="cal-tl cal-tl-occupied" /> Ocupado</span>
            <span><i className="cal-tl cal-tl-blocked" /> Bloqueado</span>
            <span><i className="cal-tl cal-tl-past" /> Passado</span>
          </div>
        </div>
      )}
      {dayAvailability && !dayAvailability.isWorkDay && (
        <div className="cal-timeline cal-timeline-off">Sem expediente neste dia</div>
      )}

      {loading ? (
        <div className="cal-empty">
          <div className="cal-spinner" />
          <p>Carregando...</p>
        </div>
      ) : dayAppointments.length === 0 ? (
        <div className="cal-empty">
          <FiClock size={22} />
          <p>Nenhum agendamento neste dia</p>
          <small>Use o botão "+ Novo Agendamento" para criar um.</small>
        </div>
      ) : (
        dayAppointments.map((appt) => {
          const customer = customerOf(appt.customerId);
          const service = serviceOf(appt.serviceId);
          const start = new Date(appt.scheduledAt);
          const end = new Date(start.getTime() + appt.duration * 60000);
          const busy = updatingId === appt.id;
          const finished = ["completed", "cancelled", "no_show"].includes(appt.status);

          return (
            <div key={appt.id} className={`cal-appt cal-appt-${appt.status}`}>
              <div className="cal-appt-time">
                <strong>{timeOf(appt.scheduledAt)}</strong>
                <small>
                  {end.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}
                </small>
              </div>

              <div className="cal-appt-body">
                <div className="cal-appt-row">
                  <FiUser size={13} />
                  <strong>{customer?.name ?? `Cliente #${appt.customerId}`}</strong>
                  <span className={`cal-badge cal-badge-${appt.status}`}>
                    {statusLabels[appt.status] ?? appt.status}
                  </span>
                </div>
                <p className="cal-appt-service">
                  {service?.title ?? `Serviço #${appt.serviceId}`} · {appt.duration} min
                  {appt.isHomeService && (
                    <>
                      {" "}· 🏠 domicílio
                      {(appt.travelMinutes ?? 0) > 0 && ` (+${appt.travelMinutes} min deslocamento)`}
                    </>
                  )}
                </p>
                <p className="cal-appt-price">
                  <FiDollarSign size={12} />
                  {formatMoney(Number(appt.price))}
                </p>
                {appt.notes && <p className="cal-appt-notes">{appt.notes}</p>}

                {!finished && (
                  <div className="cal-appt-actions">
                    {appt.status === "scheduled" && (
                      <button
                        disabled={busy}
                        className="cal-action cal-action-primary"
                        onClick={() => updateStatus(appt.id, "confirmed")}
                      >
                        Confirmar
                      </button>
                    )}
                    {(appt.status === "scheduled" || appt.status === "confirmed") && (
                      <button
                        disabled={busy}
                        className="cal-action cal-action-primary"
                        onClick={() => updateStatus(appt.id, "in_progress")}
                      >
                        Iniciar
                      </button>
                    )}
                    {appt.status === "in_progress" && (
                      <button
                        disabled={busy}
                        className="cal-action cal-action-primary"
                        onClick={() => updateStatus(appt.id, "completed")}
                      >
                        Finalizar
                      </button>
                    )}
                    {appt.status !== "in_progress" && (
                      <>
                        <button
                          disabled={busy}
                          className="cal-action"
                          onClick={() => updateStatus(appt.id, "no_show")}
                        >
                          Não veio
                        </button>
                        <button
                          disabled={busy}
                          className="cal-action cal-action-danger"
                          onClick={() => updateStatus(appt.id, "cancelled")}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    <button
                      disabled={busy}
                      className="cal-action cal-action-link"
                      onClick={() => generateMeetingLink(appt.id)}
                      title="Gera o link único do atendimento e copia para a área de transferência"
                    >
                      {copiedId === appt.id ? (
                        <><FiCheck size={12} /> Link copiado</>
                      ) : (
                        <><FiLink size={12} /> Gerar Link do Atendimento</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );

  return (
    <div className="cal-page">
      {/* ── Barra superior ── */}
      <div className="cal-toolbar">
        <h1 className="cal-title">
          {monthNames[viewDate.getMonth()]}{" "}
          <span className="cal-title-year">{viewDate.getFullYear()}</span>
        </h1>
        <div className="cal-controls">
          <button className="cal-ctrl" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
            <FiChevronLeft size={16} />
          </button>
          <button className="cal-ctrl cal-ctrl-today" onClick={goToday}>
            Hoje
          </button>
          <button className="cal-ctrl" onClick={() => changeMonth(1)} aria-label="Próximo mês">
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Fita de dias (mobile) ── */}
      <div className="cal-daystrip" ref={stripRef}>
        {stripDays.map((d) => {
          const key = dayKey(d);
          const dayAppts = byDay.get(key) ?? [];
          const activeCount = dayAppts.filter(
            (a) => a.status !== "cancelled" && a.status !== "no_show"
          ).length;
          const classes = [
            "cal-strip-day",
            key === todayKey ? "today" : "",
            key === selectedKey ? "selected" : "",
          ].join(" ");
          return (
            <button key={key} className={classes} onClick={() => setSelectedDay(new Date(d))}>
              <small>{weekDaysShort[d.getDay()]}</small>
              <strong>{d.getDate()}</strong>
              <span className="cal-strip-dots">
                {Array.from({ length: Math.min(activeCount, 3) }, (_, i) => <i key={i} />)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grade do mês (desktop) ── */}
      <div className="cal-sheet">
        <div className="cal-weekrow">
          {weekDaysShort.map((d) => (
            <span key={d} className="cal-weekday">{d}</span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((d) => {
            const key = dayKey(d);
            const inMonth = d.getMonth() === viewDate.getMonth();
            const dayAppts = byDay.get(key) ?? [];
            const visible = dayAppts.slice(0, 3);
            const overflow = dayAppts.length - visible.length;

            const classes = [
              "cal-cell",
              inMonth ? "" : "cal-cell-out",
              key === selectedKey ? "cal-cell-selected" : "",
            ].join(" ");

            return (
              <div
                key={key}
                className={classes}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedDay(new Date(d));
                  setPanelOpen(true);
                  if (!inMonth) setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSelectedDay(new Date(d));
                    setPanelOpen(true);
                  }
                }}
              >
                <span className={`cal-cell-num ${key === todayKey ? "cal-cell-num-today" : ""}`}>
                  {d.getDate()}
                </span>

                <div className="cal-chips">
                  {visible.map((appt) => {
                    const inactive = appt.status === "cancelled" || appt.status === "no_show";
                    return (
                      <span
                        key={appt.id}
                        className={`cal-chip cal-chip-${appt.status}`}
                        title={`${timeOf(appt.scheduledAt)} — ${
                          customerOf(appt.customerId)?.name ?? "Cliente"
                        }`}
                      >
                        <i className="cal-chip-dot" />
                        <b>{timeOf(appt.scheduledAt)}</b>
                        <span className={inactive ? "cal-chip-strike" : ""}>
                          {customerOf(appt.customerId)?.name ?? "Cliente"}
                        </span>
                      </span>
                    );
                  })}
                  {overflow > 0 && <span className="cal-chip-more">+{overflow} mais</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Painel do dia inline (mobile) ── */}
      <section className="cal-mobile-day">
        <header className="cal-mobile-day-head">
          <h2>{dayLabel}</h2>
          {activeDayAppts.length > 0 && (
            <span className="cal-daypanel-summary">
              {activeDayAppts.length} atendimento{activeDayAppts.length === 1 ? "" : "s"} ·{" "}
              {formatMoney(dayTotal)}
            </span>
          )}
        </header>
        {dayPanelBody}
      </section>

      {/* ── Drawer do dia (desktop) ── */}
      {panelOpen && (
        <>
          <div className="cal-overlay" onClick={() => setPanelOpen(false)} />
          <aside className="cal-drawer">
            <header className="cal-drawer-head">
              <div>
                <h2 className="cal-drawer-title">{dayLabel}</h2>
                {activeDayAppts.length > 0 && (
                  <p className="cal-drawer-summary">
                    {activeDayAppts.length} atendimento{activeDayAppts.length === 1 ? "" : "s"} ·{" "}
                    {formatMoney(dayTotal)}
                  </p>
                )}
              </div>
              <button className="cal-drawer-close" onClick={() => setPanelOpen(false)} aria-label="Fechar">
                <FiX size={18} />
              </button>
            </header>

            <div className="cal-drawer-body">{dayPanelBody}</div>
          </aside>
        </>
      )}

      <ClientSchedulingForm onAppointmentCreated={loadData} />
    </div>
  );
};

export default Calendar;
