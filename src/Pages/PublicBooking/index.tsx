import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiUser, FiScissors, FiClock, FiCalendar,
  FiCheck, FiCheckCircle, FiHome, FiChevronLeft, FiDollarSign, FiMessageSquare, FiLogOut,
  FiStar, FiList,
} from "react-icons/fi";
import {
  apiFetch, clientApiFetch, tzOffsetMin,
  getClientSession, clearClientSession,
  type ClientSession,
} from "@/api/client";
import ClientAuthGate from "@/Components/ClientAuthGate";
import ClientAddressBook from "@/Components/ClientAddressBook";
import ClientHistoryModal from "@/Components/ClientHistoryModal";
import "./index.css";

interface PublicProfile {
  name: string;
  businessType: string;
  homeService: boolean;
  services: { id: number; title: string; description: string | null; duration: number; price: string; category: string | null }[];
}

interface RecommendedService {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  price: string;
  category: string | null;
  timesBooked: number;
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
  travelMinutes?: number;
  travelUnavailable?: boolean;
  travelKm?: number | null;
  travelCost?: number;
  exceedsMaxDistance?: boolean;
  maxDistanceKm?: number | null;
}

type Step = 1 | 2 | 3;

const stepTitles: Record<Step, string> = {
  1: "Escolha o serviço",
  2: "Data e horário",
  3: "Confirmar agendamento",
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PublicBookingInner = ({ profile, slug }: { profile: PublicProfile | null; slug: string }) => {
  const [client] = useState<ClientSession | null>(() => getClientSession());
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Etapa 1 — serviço
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [recommendedServices, setRecommendedServices] = useState<RecommendedService[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!slug) return;
    clientApiFetch(`/public/${slug}/history`)
      .then((data) => setRecommendedServices(data.recommendedServices ?? []))
      .catch(() => setRecommendedServices([]));
  }, [slug]);

  // Etapa 2 — data/horário
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DaySlot | null>(null);
  const [homeService, setHomeService] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Etapa 3
  const [notes, setNotes] = useState("");
  const [createdAppointment, setCreatedAppointment] = useState<{ price: string; travelCost?: string; travelDistanceKm?: string } | null>(null);

  const selectedService = profile?.services.find((s) => s.id === selectedServiceId) ?? null;

  const loadAvailability = useCallback(() => {
    if (!slug || !selectedServiceId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const homeParams =
      homeService && selectedAddressId ? `&homeService=1&addressId=${selectedAddressId}` : "";
    clientApiFetch(`/public/${slug}/availability?date=${date}&serviceId=${selectedServiceId}&tz=${tzOffsetMin}${homeParams}`)
      .then((data) => setAvailability(data))
      .catch(() => setAvailability(null))
      .finally(() => setLoadingSlots(false));
  }, [slug, date, selectedServiceId, homeService, selectedAddressId]);

  useEffect(() => {
    if (step === 2) loadAvailability();
  }, [step, loadAvailability]);

  const handleConfirm = async () => {
    if (!slug || !selectedServiceId || !selectedSlot) return;
    if (homeService && !selectedAddressId) {
      setError("Selecione um endereço para o atendimento a domicílio");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await clientApiFetch(`/public/${slug}/appointments`, {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedServiceId,
          scheduledAt: selectedSlot.startAt,
          tzOffsetMin,
          isHomeService: homeService,
          addressId: homeService ? selectedAddressId : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setCreatedAppointment(created);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearClientSession();
    window.location.reload();
  };

  const startNewBooking = () => {
    setStep(1);
    setError("");
    setSuccess(false);
    setSelectedServiceId(null);
    setDate(todayISO());
    setAvailability(null);
    setSelectedSlot(null);
    setHomeService(false);
    setSelectedAddressId(null);
    setNotes("");
    setCreatedAppointment(null);
  };

  const dateLabel = (() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });
  })();

  return (
    <div className="pbook-page">
      <header className="pbook-header">
        <div className="pbook-avatar">{profile?.name?.[0]?.toUpperCase() ?? "?"}</div>
        <div className="pbook-header-info">
          <strong>{profile?.name ?? "Carregando..."}</strong>
          <small>{profile?.businessType ?? ""}</small>
        </div>
        {slug && (
          <Link to={`/p/${slug}`} className="pbook-header-link">
            <FiMessageSquare size={13} /> Falar com a IA
          </Link>
        )}
      </header>

      {client && (
        <div className="pbook-clientbar">
          <FiUser size={13} />
          <span>Olá, <strong>{client.name.split(" ")[0]}</strong></span>
          <div className="pbook-clientbar-actions">
            <button onClick={() => setShowHistory(true)} title="Ver meus agendamentos">
              <FiList size={13} /> Meus agendamentos
            </button>
            <button onClick={handleLogout} title="Sair da conta">
              <FiLogOut size={13} /> Sair
            </button>
          </div>
        </div>
      )}

      {showHistory && slug && (
        <ClientHistoryModal slug={slug} onClose={() => setShowHistory(false)} />
      )}

      <div className="pbook-card">
        {!success && (
          <>
            <div className="pbook-progress">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`pbook-progress-step ${step >= s ? "done" : ""} ${step === s ? "current" : ""}`}>
                  <span className="pbook-progress-dot">{step > s ? <FiCheck size={11} /> : s}</span>
                  <small>{["Serviço", "Horário", "Confirmar"][s - 1]}</small>
                </div>
              ))}
            </div>

            <div className="pbook-body-head">
              {step > 1 && (
                <button className="pbook-back" onClick={() => setStep((s) => (s - 1) as Step)} aria-label="Voltar">
                  <FiChevronLeft size={18} />
                </button>
              )}
              <h2>{stepTitles[step]}</h2>
            </div>

            {error && <div className="pbook-error">{error}</div>}
          </>
        )}

        {success ? (
          <div className="pbook-success">
            <FiCheckCircle size={40} />
            <h3>Tudo certo!</h3>
            <p>
              <strong>{client?.name}</strong>, seu horário com <strong>{profile?.name}</strong> foi agendado para{" "}
              <strong>{dateLabel}</strong> às <strong>{selectedSlot?.time}</strong>.
            </p>
            {createdAppointment && Number(createdAppointment.travelCost) > 0 && (
              <p>
                Inclui custo de deslocamento (ida e volta) de <strong>{formatMoney(Number(createdAppointment.travelCost))}</strong>
                {createdAppointment.travelDistanceKm && ` (${Number(createdAppointment.travelDistanceKm).toFixed(1)} km)`}.
                {" "}Total: <strong>{formatMoney(Number(createdAppointment.price) + Number(createdAppointment.travelCost))}</strong>
              </p>
            )}
            <button className="pbook-btn-primary pbook-btn-new" onClick={startNewBooking}>
              Fazer novo agendamento
            </button>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="pbook-step">
                {profile?.services.length === 0 && <p className="pbook-empty">Nenhum serviço disponível no momento.</p>}

                {recommendedServices.length > 0 && (
                  <div className="pbook-recommended">
                    <p className="pbook-recommended-title">
                      <FiStar size={12} /> Recomendados pra você
                    </p>
                    <div className="pbook-list">
                      {recommendedServices.map((s) => (
                        <button
                          key={s.id}
                          className={`pbook-item pbook-item-recommended ${selectedServiceId === s.id ? "selected" : ""}`}
                          onClick={() => { setSelectedServiceId(s.id); setStep(2); }}
                        >
                          <span className="pbook-item-icon"><FiScissors size={14} /></span>
                          <span className="pbook-item-info">
                            <strong>{s.title}</strong>
                            <small>
                              <FiClock size={10} /> {s.duration} min{s.category ? ` · ${s.category}` : ""}
                              {" · "}pedido {s.timesBooked}x
                            </small>
                          </span>
                          <span className="pbook-item-price">{formatMoney(Number(s.price))}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pbook-list">
                  {profile?.services.map((s) => (
                    <button
                      key={s.id}
                      className={`pbook-item ${selectedServiceId === s.id ? "selected" : ""}`}
                      onClick={() => { setSelectedServiceId(s.id); setStep(2); }}
                    >
                      <span className="pbook-item-icon"><FiScissors size={14} /></span>
                      <span className="pbook-item-info">
                        <strong>{s.title}</strong>
                        <small><FiClock size={10} /> {s.duration} min{s.category ? ` · ${s.category}` : ""}</small>
                      </span>
                      <span className="pbook-item-price">{formatMoney(Number(s.price))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="pbook-step">
                {profile?.homeService && (
                  <label className="pbook-check">
                    <input
                      type="checkbox"
                      checked={homeService}
                      onChange={(e) => setHomeService(e.target.checked)}
                    />
                    <FiHome size={14} /> Atendimento a domicílio
                  </label>
                )}

                {homeService && (
                  <ClientAddressBook selectedId={selectedAddressId} onSelect={setSelectedAddressId} />
                )}

                {homeService && selectedAddressId && availability?.exceedsMaxDistance && (
                  <div className="pbook-error">
                    Esse endereço fica fora do raio de atendimento a domicílio
                    {availability.maxDistanceKm ? ` (máximo ${availability.maxDistanceKm} km)` : ""}. Escolha outro endereço.
                  </div>
                )}

                {homeService && selectedAddressId && !availability?.exceedsMaxDistance && (availability?.travelCost ?? 0) > 0 && (
                  <p className="pbook-meta">
                    Custo de deslocamento (ida e volta) para este endereço:{" "}
                    <strong>{formatMoney(availability!.travelCost!)}</strong>
                    {availability?.travelKm != null && ` (${availability.travelKm.toFixed(1)} km)`}
                  </p>
                )}

                <div className="pbook-datebar">
                  <FiCalendar size={15} />
                  <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
                  <span>{dateLabel}</span>
                </div>

                {loadingSlots ? (
                  <p className="pbook-empty">Carregando horários...</p>
                ) : !availability || !availability.isWorkDay ? (
                  <p className="pbook-empty">Sem expediente neste dia. Escolha outra data.</p>
                ) : (
                  <>
                    <p className="pbook-meta">Expediente {availability.workStart} – {availability.workEnd}</p>
                    <div className="pbook-slots">
                      {availability.slots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={slot.status !== "available"}
                          className={`pbook-slot pbook-slot-${slot.status} ${selectedSlot?.time === slot.time ? "selected" : ""}`}
                          onClick={() => { setSelectedSlot(slot); setStep(3); }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && selectedService && selectedSlot && (
              <div className="pbook-step">
                <div className="pbook-summary">
                  <div className="pbook-summary-row">
                    <FiUser size={14} />
                    <div><small>Cliente</small><strong>{client?.name}</strong></div>
                  </div>
                  <div className="pbook-summary-row">
                    <FiScissors size={14} />
                    <div>
                      <small>Serviço</small>
                      <strong>{selectedService.title}</strong>
                      <span>{selectedService.duration} min</span>
                    </div>
                  </div>
                  <div className="pbook-summary-row">
                    <FiDollarSign size={14} />
                    <div>
                      <small>Valor</small>
                      <strong>{formatMoney(Number(selectedService.price))}</strong>
                      {homeService && (availability?.travelCost ?? 0) > 0 && (
                        <span>
                          + {formatMoney(availability!.travelCost!)} de deslocamento (ida e volta) ={" "}
                          {formatMoney(Number(selectedService.price) + availability!.travelCost!)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pbook-summary-row">
                    <FiCalendar size={14} />
                    <div>
                      <small>Quando</small>
                      <strong style={{ textTransform: "capitalize" }}>{dateLabel}</strong>
                      <span>às {selectedSlot.time}</span>
                    </div>
                  </div>
                </div>

                <div className="pbook-field">
                  <label>Observações (opcional)</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma informação adicional?" />
                </div>

                <button
                  className="pbook-btn-primary"
                  disabled={submitting || Boolean(homeService && availability?.exceedsMaxDistance)}
                  onClick={handleConfirm}
                >
                  {submitting ? "Agendando..." : "Confirmar agendamento"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch(`/public/${slug}`)
      .then((data) => setProfile(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="pbook-page pbook-center">
        <p>Página não encontrada.</p>
      </div>
    );
  }

  return (
    <ClientAuthGate businessName={profile?.name}>
      <PublicBookingInner profile={profile} slug={slug ?? ""} />
    </ClientAuthGate>
  );
};

export default PublicBooking;
