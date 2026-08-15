import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  FiChevronLeft, FiUser, FiPhone, FiLock, FiCreditCard, FiMail,
  FiScissors, FiClock, FiCalendar, FiHome, FiDollarSign, FiList, FiLogOut, FiPlus, FiMinus,
} from "react-icons/fi";
import {
  API_URL, apiFetch, clientApiFetch, tzOffsetMin,
  getClientToken, getClientSession, saveClientSession, clearClientSession,
  type ClientSession,
} from "@/api/client";
import { formatCPF, formatPhone, validateCPF } from "../../SignUp/passwordValidation";
import ClientAddressBook from "@/Components/ClientAddressBook";
import "./index.css";

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const formatHistoryDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const formatHistoryTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

// Essa é página onde o usuario se agenda
// ele funcionará como um chekout de pagamento

// Ele vai ser dividido em steps
// Cadastro, Serviço, Produto, Endereço, Horario e Confirmação
const stepTitles = ["Cadastro", "Serviços", "Produtos", "Endereço", "Horário", "Confirmação"];

interface PublicProfile {
  name: string;
  businessType: string;
  homeService: boolean;
  services: { id: number; title: string; description: string | null; duration: number; price: string; category: string | null }[];
  products: { id: number; name: string; price: string }[];
}

interface DaySlot {
  time: string;
  startAt: string;
  status: "available" | "occupied" | "blocked" | "past" | "unavailable";
  blockTitle?: string;
}

interface HistoryAppointment {
  id: number;
  scheduledAt: string;
  duration: number;
  price: string;
  status: string;
  isHomeService: boolean;
  travelCost: string;
  serviceId: number;
  serviceTitle: string;
}

interface DayAvailability {
  isWorkDay: boolean;
  workStart: string | null;
  workEnd: string | null;
  slots: DaySlot[];
  travelKm?: number | null;
  travelCost?: number;
  exceedsMaxDistance?: boolean;
  maxDistanceKm?: number | null;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const Agenda = () => {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [error, setError] = useState("");

  const advance = (index: number) => {
    setStep(index);
    setMaxStep((m) => Math.max(m, index));
  };
  const goToStep = (index: number) => {
    if (index <= maxStep) setStep(index);
  };

  // Perfil público do negócio
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  useEffect(() => {
    if (!slug) return;
    apiFetch(`/public/${slug}`)
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
  }, [slug]);

  // Step 0 — Cadastro / login do cliente
  const [session, setSession] = useState<ClientSession | null>(() =>
    getClientToken() ? getClientSession() : null
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [login, setLogin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [historyAppointments, setHistoryAppointments] = useState<HistoryAppointment[] | null>(null);

  useEffect(() => {
    if (!showHistory || !slug) return;
    setHistoryAppointments(null);
    clientApiFetch(`/public/${slug}/history`)
      .then((data) => setHistoryAppointments(data.appointments ?? []))
      .catch(() => setHistoryAppointments([]));
  }, [showHistory, slug]);

  const goBack = () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const submitAuth = async (path: string, body: object) => {
    setAuthSubmitting(true);
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Erro na requisição");
      saveClientSession(data.token, data.client);
      setSession(data.client);
      advance(1);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = () => {
    const cpfCheck = validateCPF(cpf);
    if (!cpfCheck.valid) {
      setAuthError(cpfCheck.message);
      return;
    }
    submitAuth("/client/register", { name, cpf, phone, email: email.trim() || undefined, password, lgpdAccepted });
  };

  const handleLogin = () => {
    submitAuth("/client/login", { login, password: loginPassword });
  };

  const registerValid =
    name.trim().length > 1 && cpf.replace(/\D/g, "").length === 11 &&
    phone.replace(/\D/g, "").length >= 10 && password.length >= 6 && lgpdAccepted;

  const loginValid = login.replace(/\D/g, "").length >= 10 && loginPassword.length > 0;

  const handleLogout = () => {
    clearClientSession();
    window.location.reload();
  };

  // Step 1 — Serviços
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const selectedService = profile?.services.find((s) => s.id === selectedServiceId) ?? null;

  // Step 2 — Produtos
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const incrementProduct = (id: number) =>
    setProductQuantities((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  const decrementProduct = (id: number) =>
    setProductQuantities((prev) => {
      const qty = (prev[id] ?? 0) - 1;
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  const selectedProducts = (profile?.products ?? [])
    .filter((p) => (productQuantities[p.id] ?? 0) > 0)
    .map((p) => ({ ...p, quantity: productQuantities[p.id] }));
  const productsTotal = selectedProducts.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

  // Step 3 — Endereço
  const [homeService, setHomeService] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Step 4 — Horário
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DaySlot | null>(null);

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
    if (step === 4) loadAvailability();
  }, [step, loadAvailability]);

  // Step 5 — Confirmação
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<{ price: string; travelCost?: string; travelDistanceKm?: string } | null>(null);

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

  const startNewBooking = () => {
    setSelectedServiceId(null);
    setProductQuantities({});
    setHomeService(false);
    setSelectedAddressId(null);
    setDate(todayISO());
    setAvailability(null);
    setSelectedSlot(null);
    setNotes("");
    setCreatedAppointment(null);
    setSuccess(false);
    setError("");
    setStep(1);
    setMaxStep(1);
  };

  const isWelcomeScreen = step === 0 && Boolean(session) && !showHistory;

  const dateLabel = (() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });
  })();

  return (
    <div className="agenda-page">
      <div className="container-agenda">

        {/* Vai ter dois lados */}
        {/* Primeiro: lado, onde seleciona */}
        <div className="side side-one">
          {!isWelcomeScreen && (
            <div className="header-side">
              {/* Icone de voltar */}
              {/* Titulo do step */}
              <button onClick={goBack} disabled={!showHistory && step === 0}><FiChevronLeft /></button>
              <span>{showHistory ? "Meus agendamentos" : stepTitles[step]}</span>
            </div>
          )}

          <form className="agenda-form" onSubmit={(e) => e.preventDefault()}>
            {error && <div className="agenda-error">{error}</div>}

            {showHistory ? (
              <div className="agenda-step">
                {historyAppointments === null ? (
                  <p className="agenda-empty">Carregando...</p>
                ) : historyAppointments.length === 0 ? (
                  <p className="agenda-empty">Você ainda não tem agendamentos com este profissional.</p>
                ) : (
                  <div className="agenda-list">
                    {historyAppointments.map((a) => (
                      <div key={a.id} className="agenda-history-item">
                        <div className="agenda-history-row">
                          <FiCalendar size={12} /> <span>{formatHistoryDate(a.scheduledAt)}</span>
                          <FiClock size={12} /> <span>{formatHistoryTime(a.scheduledAt)}</span>
                        </div>
                        <div className="agenda-history-row">
                          <strong>{a.serviceTitle}</strong>
                          <span className="agenda-history-badge">{statusLabels[a.status] ?? a.status}</span>
                        </div>
                        <div className="agenda-history-row">
                          <FiDollarSign size={11} />
                          <span>{formatMoney(Number(a.price) + Number(a.travelCost))}</span>
                          {a.isHomeService && <span>· domicílio</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : step === 0 && session ? (
              <div className="agenda-step agenda-welcome">
                <div className="agenda-welcome-avatar">{session.name[0]?.toUpperCase()}</div>
                <p className="agenda-greeting">
                  {greeting()}, <strong>{session.name.split(" ")[0]}</strong>
                </p>
                <p className="agenda-welcome-sub">{formatPhone(session.phone)}</p>

                <div className="agenda-welcome-actions">
                  <button type="button" className="agenda-btn-primary" onClick={() => advance(1)}>
                    Fazer um novo agendamento
                  </button>
                  <button type="button" className="agenda-btn-secondary" onClick={() => setShowHistory(true)}>
                    <FiList size={13} /> Meus agendamentos
                  </button>
                </div>

                <button type="button" className="agenda-btn-logout" onClick={handleLogout}>
                  <FiLogOut size={13} /> Sair da conta
                </button>
              </div>
            ) : step === 0 && (
              <div className="agenda-step">
                <div className="agenda-tabs">
                  <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); }}>Criar conta</button>
                  <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Já tenho conta</button>
                </div>

                {authError && <div className="agenda-error">{authError}</div>}

                {authMode === "register" ? (
                  <>
                    <div className="agenda-field">
                      <label><FiUser size={13} /> Nome completo</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div className="agenda-field">
                      <label><FiCreditCard size={13} /> CPF</label>
                      <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
                    </div>
                    <div className="agenda-field">
                      <label><FiPhone size={13} /> Celular</label>
                      <input inputMode="numeric" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="agenda-field">
                      <label><FiMail size={13} /> Email (opcional)</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                    </div>
                    <div className="agenda-field">
                      <label><FiLock size={13} /> Senha</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <label className="agenda-check">
                      <input type="checkbox" checked={lgpdAccepted} onChange={(e) => setLgpdAccepted(e.target.checked)} />
                      <span>Autorizo o uso dos meus dados para agendamento e contato (LGPD).</span>
                    </label>
                    <button type="button" className="agenda-btn-primary" disabled={!registerValid || authSubmitting} onClick={handleRegister}>
                      {authSubmitting ? "Criando conta..." : "Criar conta e continuar"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="agenda-field">
                      <label><FiCreditCard size={13} /> CPF ou celular</label>
                      <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="CPF ou celular" />
                    </div>
                    <div className="agenda-field">
                      <label><FiLock size={13} /> Senha</label>
                      <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Sua senha" />
                    </div>
                    <button type="button" className="agenda-btn-primary" disabled={!loginValid || authSubmitting} onClick={handleLogin}>
                      {authSubmitting ? "Entrando..." : "Entrar"}
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="agenda-step">
                {profile?.services.length === 0 && <p className="agenda-empty">Nenhum serviço disponível no momento.</p>}
                <div className="agenda-list">
                  {profile?.services.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`agenda-item ${selectedServiceId === s.id ? "selected" : ""}`}
                      onClick={() => { setSelectedServiceId(s.id); advance(2); }}
                    >
                      <span className="agenda-item-icon"><FiScissors size={14} /></span>
                      <span className="agenda-item-info">
                        <strong>{s.title}</strong>
                        <small><FiClock size={10} /> {s.duration} min{s.category ? ` · ${s.category}` : ""}</small>
                      </span>
                      <span className="agenda-item-price">{formatMoney(Number(s.price))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="agenda-step">
                {profile?.products.length === 0 && <p className="agenda-empty">Nenhum produto disponível no momento.</p>}
                <div className="agenda-list">
                  {profile?.products.map((p) => {
                    const quantity = productQuantities[p.id] ?? 0;
                    return (
                      <div key={p.id} className={`agenda-item agenda-item-product ${quantity > 0 ? "selected" : ""}`}>
                        <span className="agenda-item-info">
                          <strong>{p.name}</strong>
                        </span>
                        <span className="agenda-item-price">{formatMoney(Number(p.price))}</span>
                        <span className="agenda-qty">
                          <button type="button" onClick={() => decrementProduct(p.id)} disabled={quantity === 0} aria-label="Diminuir quantidade">
                            <FiMinus size={12} />
                          </button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => incrementProduct(p.id)} aria-label="Aumentar quantidade">
                            <FiPlus size={12} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="agenda-btn-primary" onClick={() => advance(3)}>Continuar</button>
              </div>
            )}

            {step === 3 && (
              <div className="agenda-step">
                {!profile?.homeService ? (
                  <>
                    <p className="agenda-empty">Este profissional não oferece atendimento a domicílio.</p>
                    <button type="button" className="agenda-btn-primary" onClick={() => advance(4)}>Continuar</button>
                  </>
                ) : (
                  <>
                    <label className="agenda-check">
                      <input type="checkbox" checked={homeService} onChange={(e) => setHomeService(e.target.checked)} />
                      <FiHome size={14} /> Atendimento a domicílio
                    </label>
                    {homeService && (
                      <ClientAddressBook selectedId={selectedAddressId} onSelect={setSelectedAddressId} />
                    )}
                    <button
                      type="button"
                      className="agenda-btn-primary"
                      disabled={homeService && !selectedAddressId}
                      onClick={() => advance(4)}
                    >
                      Continuar
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="agenda-step">
                <div className="agenda-datebar">
                  <FiCalendar size={15} />
                  <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
                  <span>{dateLabel}</span>
                </div>

                {homeService && selectedAddressId && availability?.exceedsMaxDistance && (
                  <div className="agenda-error">
                    Esse endereço fica fora do raio de atendimento a domicílio
                    {availability.maxDistanceKm ? ` (máximo ${availability.maxDistanceKm} km)` : ""}.
                  </div>
                )}

                {loadingSlots ? (
                  <p className="agenda-empty">Carregando horários...</p>
                ) : !availability || !availability.isWorkDay ? (
                  <p className="agenda-empty">Sem expediente neste dia. Escolha outra data.</p>
                ) : (
                  <>
                    <p className="agenda-meta">Expediente {availability.workStart} – {availability.workEnd}</p>
                    <div className="agenda-slots">
                      {availability.slots.map((slot) => (
                        <button
                          type="button"
                          key={slot.time}
                          disabled={slot.status !== "available"}
                          className={`agenda-slot agenda-slot-${slot.status} ${selectedSlot?.time === slot.time ? "selected" : ""}`}
                          onClick={() => { setSelectedSlot(slot); advance(5); }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 5 && success ? (
              <div className="agenda-step agenda-success">
                <div className="agenda-check-anim">
                  <svg viewBox="0 0 52 52" className="agenda-check-svg">
                    <circle className="agenda-check-ring" cx="26" cy="26" r="24" fill="none" />
                    <path className="agenda-check-mark" fill="none" d="M14 27l7 7 16-16" />
                  </svg>
                </div>
                <h3>Tudo certo!</h3>
                <p>
                  <strong>{session?.name}</strong>, seu horário com <strong>{profile?.name}</strong> foi agendado para{" "}
                  <strong>{dateLabel}</strong> às <strong>{selectedSlot?.time}</strong>.
                </p>
                {selectedProducts.length > 0 && (
                  <p>
                    Inclui {selectedProducts.map((p) => `${p.name} (${p.quantity}x)`).join(", ")} ({formatMoney(productsTotal)}).
                  </p>
                )}
                {createdAppointment && Number(createdAppointment.travelCost) > 0 && (
                  <p>
                    Inclui deslocamento de <strong>{formatMoney(Number(createdAppointment.travelCost))}</strong>.
                  </p>
                )}
                <p>
                  Total: <strong>
                    {formatMoney(
                      Number(createdAppointment?.price ?? selectedService?.price ?? 0) +
                      productsTotal +
                      Number(createdAppointment?.travelCost ?? 0)
                    )}
                  </strong>
                </p>
                <button type="button" className="agenda-btn-primary" onClick={startNewBooking}>
                  Fazer outro agendamento
                </button>
              </div>
            ) : step === 5 && selectedService && selectedSlot ? (
              <div className="agenda-step">
                <div className="agenda-field">
                  <label>Observações (opcional)</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma informação adicional?" />
                </div>
                <button
                  type="button"
                  className="agenda-btn-primary"
                  disabled={submitting || Boolean(homeService && availability?.exceedsMaxDistance)}
                  onClick={handleConfirm}
                >
                  {submitting ? "Agendando..." : "Confirmar agendamento"}
                </button>
              </div>
            ) : null}
          </form>

          {!showHistory && !isWelcomeScreen && (
            <div className="footer-side">
              <div className="container-cicle">
                {stepTitles.map((title, index) => (
                  <div
                    key={title}
                    className={`cicle ${index === step ? "cicle-active" : ""} ${index > maxStep ? "cicle-disabled" : ""}`}
                    onClick={() => goToStep(index)}
                  ></div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Segundo: onde ve os dados  */}
        <div className="side side-two">
          <div className="agenda-summary">
            <strong>{profile?.name ?? "Carregando..."}</strong>
            {selectedService && (
              <div className="agenda-summary-row">
                <FiScissors size={13} />
                <span>{selectedService.title} — {formatMoney(Number(selectedService.price))}</span>
              </div>
            )}
            {selectedProducts.map((p) => (
              <div className="agenda-summary-row" key={p.id}>
                <FiScissors size={13} />
                <span>{p.name} ({p.quantity}x) — {formatMoney(Number(p.price) * p.quantity)}</span>
              </div>
            ))}
            {homeService && selectedAddressId && (
              <div className="agenda-summary-row">
                <FiHome size={13} />
                <span>Atendimento a domicílio</span>
              </div>
            )}
            {selectedSlot && (
              <div className="agenda-summary-row">
                <FiCalendar size={13} />
                <span style={{ textTransform: "capitalize" }}>{dateLabel} às {selectedSlot.time}</span>
              </div>
            )}
            {selectedService && (
              <div className="agenda-summary-row agenda-summary-total">
                <FiDollarSign size={13} />
                <span>
                  Total: {formatMoney(Number(selectedService.price) + productsTotal + (homeService ? (availability?.travelCost ?? 0) : 0))}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Agenda;
