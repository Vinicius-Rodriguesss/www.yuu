import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiUser, FiScissors, FiClock, FiCalendar,
  FiCheck, FiCheckCircle, FiHome, FiChevronLeft, FiDollarSign, FiMessageSquare, FiLogOut,
} from "react-icons/fi";
import {
  apiFetch, clientApiFetch, tzOffsetMin,
  getClientSession, saveClientSession, getClientToken, clearClientSession,
  type ClientSession,
} from "@/api/client";
import { formatCEP, type ViaCEPResponse } from "../../SignUp/passwordValidation";
import ClientAuthGate from "@/Components/ClientAuthGate";
import "./index.css";

interface PublicProfile {
  name: string;
  businessType: string;
  homeService: boolean;
  services: { id: number; title: string; description: string | null; duration: number; price: string; category: string | null }[];
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
}

const emptyAddress = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

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
  const [client, setClient] = useState<ClientSession | null>(() => getClientSession());
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Etapa 1 — serviço
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Etapa 2 — data/horário
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DaySlot | null>(null);
  const [homeService, setHomeService] = useState(false);
  const [address, setAddress] = useState({ ...emptyAddress });
  const [cepStatus, setCepStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  // Etapa 3
  const [notes, setNotes] = useState("");
  const [createdAppointment, setCreatedAppointment] = useState<{ price: string; travelCost?: string; travelDistanceKm?: string } | null>(null);

  // Atualiza os dados da conta (inclui endereço salvo) e pré-preenche o endereço
  useEffect(() => {
    if (!getClientToken()) return;
    clientApiFetch("/client/me")
      .then((data) => {
        const token = getClientToken();
        if (token && data?.client) {
          saveClientSession(token, data.client);
          setClient(data.client);
          if (data.client.address) setAddress({ ...data.client.address });
        }
      })
      .catch(() => {});
  }, []);

  const selectedService = profile?.services.find((s) => s.id === selectedServiceId) ?? null;

  const loadAvailability = useCallback(() => {
    if (!slug || !selectedServiceId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    clientApiFetch(`/public/${slug}/availability?date=${date}&serviceId=${selectedServiceId}&tz=${tzOffsetMin}`)
      .then((data) => setAvailability(data))
      .catch(() => setAvailability(null))
      .finally(() => setLoadingSlots(false));
  }, [slug, date, selectedServiceId]);

  useEffect(() => {
    if (step === 2) loadAvailability();
  }, [step, loadAvailability]);

  // Busca o endereço automaticamente quando o CEP tem 8 dígitos
  useEffect(() => {
    const numbers = address.cep.replace(/\D/g, "");
    if (numbers.length !== 8) {
      setCepStatus(numbers.length > 0 ? { type: "error", message: "CEP deve conter 8 dígitos." } : null);
      return;
    }
    // Endereço já completo (veio salvo da conta): não sobrescreve
    if (address.street && address.city) {
      setCepStatus(null);
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
        setAddress((p) => ({
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
  }, [address.cep, address.street, address.city]);

  const handleConfirm = async () => {
    if (!slug || !selectedServiceId || !selectedSlot) return;
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
          address: homeService ? address : undefined,
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
          <button onClick={handleLogout} title="Sair da conta">
            <FiLogOut size={13} /> Sair
          </button>
        </div>
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
                Inclui custo de deslocamento (ida) de <strong>{formatMoney(Number(createdAppointment.travelCost))}</strong>
                {createdAppointment.travelDistanceKm && ` (${Number(createdAppointment.travelDistanceKm).toFixed(1)} km)`}.
                {" "}Total: <strong>{formatMoney(Number(createdAppointment.price) + Number(createdAppointment.travelCost))}</strong>
              </p>
            )}
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="pbook-step">
                {profile?.services.length === 0 && <p className="pbook-empty">Nenhum serviço disponível no momento.</p>}
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
                  <p className="pbook-meta">
                    Pode incluir um custo adicional de deslocamento, calculado automaticamente pela distância até o seu endereço. O valor final aparece na confirmação.
                    {client?.address && " Seu endereço salvo já foi preenchido — é só conferir."}
                  </p>
                )}

                {homeService && (
                  <div className="pbook-address">
                    <div className="pbook-field-row">
                      <div className="pbook-field">
                        <label>CEP</label>
                        <input value={address.cep} onChange={(e) => setAddress((p) => ({ ...p, cep: formatCEP(e.target.value) }))} placeholder="00000-000" />
                        {cepStatus && (
                          <small className={`pbook-cep-status pbook-cep-status-${cepStatus.type}`}>
                            {cepStatus.type === "loading" ? "Buscando..." : cepStatus.message}
                          </small>
                        )}
                      </div>
                      <div className="pbook-field">
                        <label>Número</label>
                        <input value={address.number} onChange={(e) => setAddress((p) => ({ ...p, number: e.target.value }))} />
                      </div>
                    </div>
                    <div className="pbook-field">
                      <label>Rua</label>
                      <input value={address.street} onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))} />
                    </div>
                    <div className="pbook-field-row">
                      <div className="pbook-field">
                        <label>Bairro</label>
                        <input value={address.neighborhood} onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))} />
                      </div>
                      <div className="pbook-field">
                        <label>Cidade</label>
                        <input value={address.city} onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} />
                      </div>
                    </div>
                    <div className="pbook-field">
                      <label>UF</label>
                      <input maxLength={2} value={address.state} onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value.toUpperCase() }))} />
                    </div>
                  </div>
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
                    <div><small>Valor</small><strong>{formatMoney(Number(selectedService.price))}</strong></div>
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

                <button className="pbook-btn-primary" disabled={submitting} onClick={handleConfirm}>
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
