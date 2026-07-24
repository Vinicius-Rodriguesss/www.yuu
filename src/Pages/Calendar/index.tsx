import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiUser,
  FiX,
  FiDollarSign,
  FiCheck,
  FiPlus,
  FiRotateCcw,
  FiSlash,
  FiTrash2,
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

interface BlockedSlot {
  id: number;
  type: string;
  title: string;
  startAt: string;
  endAt: string;
}

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
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  // Pedido de abertura do formulário de agendamento com data pré-selecionada
  const [scheduleRequest, setScheduleRequest] = useState<{ date: string; nonce: number } | null>(null);
  // "Serviço feito" com janela de 30s para desfazer clique acidental
  const [undoInfo, setUndoInfo] = useState<{ id: number; prevStatus: string; expiresAt: number } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  // Bloqueios de agenda (pausa, folga, compromisso pessoal) com anotação
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ title: "", startTime: "12:00", endTime: "13:00" });
  const [savingBlock, setSavingBlock] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [appts, custs, servs, blks] = await Promise.all([
        apiFetch("/appointments"),
        apiFetch("/customers"),
        apiFetch("/services"),
        apiFetch("/blocked-slots"),
      ]);
      setAppointments(appts);
      setCustomers(custs);
      setServices(servs);
      setBlocks(blks);
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

  // Countdown do "Desfazer" (serviço feito)
  useEffect(() => {
    if (!undoInfo) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((undoInfo.expiresAt - Date.now()) / 1000));
      setUndoSecondsLeft(left);
      if (left === 0) setUndoInfo(null);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [undoInfo]);

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

  const updateStatus = async (id: number, status: string, cancellationReason?: string) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, cancellationReason }),
      });
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  const openCancelModal = (id: number) => {
    setCancelReason("");
    setCancelTarget(id);
  };

  const closeCancelModal = () => {
    setCancelTarget(null);
    setCancelReason("");
  };

  const confirmCancel = async () => {
    if (cancelTarget == null) return;
    const reason = cancelReason.trim();
    await updateStatus(cancelTarget, "cancelled", reason || undefined);
    closeCancelModal();
  };

  // "Serviço feito": marca como concluído e abre janela de 30s para desfazer
  const markDone = async (appt: Appointment) => {
    await updateStatus(appt.id, "completed");
    setUndoInfo({ id: appt.id, prevStatus: appt.status, expiresAt: Date.now() + 30_000 });
  };

  const undoDone = async () => {
    if (!undoInfo) return;
    await updateStatus(undoInfo.id, undoInfo.prevStatus);
    setUndoInfo(null);
  };

  // Abre o formulário de novo agendamento já no dia clicado
  const scheduleOnDay = (d: Date) => {
    setPanelOpen(false);
    setScheduleRequest({ date: dayKey(d), nonce: Date.now() });
  };

  // ── Bloqueio de agenda ──
  const createBlock = async () => {
    const title = blockForm.title.trim();
    if (!title) {
      alert("Escreva uma anotação para o bloqueio (ex: Almoço, Consulta médica...)");
      return;
    }
    if (blockForm.endTime <= blockForm.startTime) {
      alert("O horário final precisa ser depois do inicial");
      return;
    }
    setSavingBlock(true);
    try {
      // Hora de parede no frame UTC — mesmo formato dos agendamentos
      const day = dayKey(selectedDay);
      await apiFetch("/blocked-slots", {
        method: "POST",
        body: JSON.stringify({
          type: "block",
          title,
          startAt: `${day}T${blockForm.startTime}:00.000Z`,
          endAt: `${day}T${blockForm.endTime}:00.000Z`,
        }),
      });
      setBlockFormOpen(false);
      setBlockForm({ title: "", startTime: "12:00", endTime: "13:00" });
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar bloqueio");
    } finally {
      setSavingBlock(false);
    }
  };

  const deleteBlock = async (id: number) => {
    try {
      await apiFetch(`/blocked-slots/${id}`, { method: "DELETE" });
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover bloqueio");
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
  const dayBlocks = blocks
    .filter((b) => dayKeyISO(b.startAt) === selectedKey)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const dayPanelBody = (
    <>
      {/* Agendar direto neste dia + bloquear horário */}
      <div className="cal-day-actions">
        <button className="cal-schedule-day" onClick={() => scheduleOnDay(selectedDay)}>
          <FiPlus size={14} /> Agendar neste dia
        </button>
        <button
          className={`cal-block-toggle ${blockFormOpen ? "open" : ""}`}
          onClick={() => setBlockFormOpen((v) => !v)}
        >
          <FiSlash size={13} /> Bloquear horário
        </button>
      </div>

      {/* Formulário de bloqueio: anotação + faixa de horário */}
      {blockFormOpen && (
        <div className="cal-block-form">
          <input
            type="text"
            placeholder="Anotação — ex: Almoço, Consulta médica, Buscar material..."
            value={blockForm.title}
            onChange={(e) => setBlockForm((p) => ({ ...p, title: e.target.value }))}
            maxLength={255}
            autoFocus
          />
          <div className="cal-block-form-times">
            <label>
              De
              <input
                type="time"
                value={blockForm.startTime}
                onChange={(e) => setBlockForm((p) => ({ ...p, startTime: e.target.value }))}
              />
            </label>
            <label>
              Até
              <input
                type="time"
                value={blockForm.endTime}
                onChange={(e) => setBlockForm((p) => ({ ...p, endTime: e.target.value }))}
              />
            </label>
            <button className="cal-block-save" disabled={savingBlock} onClick={createBlock}>
              {savingBlock ? "Salvando..." : "Bloquear"}
            </button>
          </div>
        </div>
      )}

      {/* Bloqueios do dia, com a anotação do profissional */}
      {dayBlocks.length > 0 && (
        <div className="cal-block-list">
          {dayBlocks.map((b) => (
            <div key={b.id} className="cal-block-item">
              <FiSlash size={12} />
              <span className="cal-block-item-time">
                {timeOf(b.startAt)} – {timeOf(b.endAt)}
              </span>
              <span className="cal-block-item-title">{b.title}</span>
              <button
                className="cal-block-item-delete"
                onClick={() => deleteBlock(b.id)}
                title="Remover bloqueio"
                aria-label="Remover bloqueio"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

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
          <small>Clique em "Agendar neste dia" para criar um.</small>
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
                    <button
                      disabled={busy}
                      className="cal-action cal-action-primary"
                      onClick={() => markDone(appt)}
                      title="Marca o atendimento como concluído — o próximo cliente já pode ser chamado"
                    >
                      <FiCheck size={12} /> Serviço feito
                    </button>
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
                      onClick={() => openCancelModal(appt.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Janela de 30s pra desfazer um "Serviço feito" acidental */}
                {undoInfo?.id === appt.id && appt.status === "completed" && (
                  <div className="cal-appt-actions">
                    <button disabled={busy} className="cal-action cal-action-undo" onClick={undoDone}>
                      <FiRotateCcw size={12} /> Desfazer ({undoSecondsLeft}s)
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

      {/* ── Modal de cancelamento ── */}
      {cancelTarget != null && (
        <>
          <div className="cal-overlay" onClick={closeCancelModal} />
          <div className="cal-cancel-modal" role="dialog" aria-modal="true">
            <h3>Cancelar agendamento</h3>
            <p>Tem certeza que deseja cancelar este atendimento? Você pode informar um motivo (opcional).</p>
            <textarea
              className="cal-cancel-textarea"
              placeholder="Motivo do cancelamento (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="cal-cancel-actions">
              <button
                className="cal-action"
                onClick={closeCancelModal}
                disabled={updatingId === cancelTarget}
              >
                Voltar
              </button>
              <button
                className="cal-action cal-action-danger cal-action-danger-solid"
                onClick={confirmCancel}
                disabled={updatingId === cancelTarget}
              >
                {updatingId === cancelTarget ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </>
      )}

      <ClientSchedulingForm onAppointmentCreated={loadData} openRequest={scheduleRequest} />
    </div>
  );
};

export default Calendar;
