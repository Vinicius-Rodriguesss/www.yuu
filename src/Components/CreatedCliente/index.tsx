/**
 * Fluxo de agendamento em etapas (estilo Calendly):
 * 1. Cliente (busca + cadastro rápido)
 * 2. Serviço
 * 3. Data & horário (disponibilidade real do backend)
 * 4. Confirmação
 */
import { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiUser, FiPlus, FiChevronLeft, FiCheck, FiClock,
  FiScissors, FiCalendar, FiPhone, FiCheckCircle, FiX, FiHome,
} from 'react-icons/fi';
import { apiFetch, tzOffsetMin } from '@/api/client';
import './index.css';
import './stepper.css';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
}

interface Service {
  id: number;
  title: string;
  description?: string;
  duration: number;
  price: string;
  category?: string;
  active?: boolean;
}

interface DaySlot {
  time: string;
  startAt: string;
  status: 'available' | 'occupied' | 'blocked' | 'past' | 'unavailable';
  blockTitle?: string;
}

interface DayAvailability {
  date: string;
  isWorkDay: boolean;
  workStart: string | null;
  workEnd: string | null;
  interval: number;
  buffer: number;
  slots: DaySlot[];
  travelMinutes?: number;
  travelUnavailable?: boolean;
}

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

const emptyAddress = { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' };

interface ClientSchedulingFormProps {
  onAppointmentCreated?: () => void;
}

type Step = 1 | 2 | 3 | 4;

const stepTitles: Record<Step, string> = {
  1: 'Escolha o cliente',
  2: 'Escolha o serviço',
  3: 'Data e horário',
  4: 'Confirmar agendamento',
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const ClientSchedulingForm = ({ onAppointmentCreated }: ClientSchedulingFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Etapa 1 — cliente
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: '', phone: '', email: '' });

  // Etapa 2 — serviço
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Etapa 3 — data/horário
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DaySlot | null>(null);

  // Domicílio (etapa 3)
  const [homeService, setHomeService] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [savingAddress, setSavingAddress] = useState(false);

  // Etapa 4 — confirmação
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetFlow = () => {
    setStep(1);
    setError('');
    setSuccess(false);
    setSelectedCustomer(null);
    setSelectedService(null);
    setSelectedSlot(null);
    setNotes('');
    setHomeService(false);
    setCustomerSearch('');
    setShowQuickCreate(false);
    setQuickForm({ name: '', phone: '', email: '' });
    setAddresses([]);
    setSelectedAddressId(null);
    setShowAddressForm(false);
    setAddressForm({ ...emptyAddress });
  };

  const loadBase = useCallback(async () => {
    try {
      const [custs, servs] = await Promise.all([
        apiFetch('/customers'),
        apiFetch('/services'),
      ]);
      setCustomers(custs);
      setServices(servs.filter((s: Service) => s.active !== false));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadBase();
  }, [isOpen, loadBase]);

  // Endereços do cliente quando "domicílio" é ativado
  useEffect(() => {
    if (!homeService || !selectedCustomer) return;
    let cancelled = false;
    apiFetch(`/customers/${selectedCustomer.id}/addresses`)
      .then((data: CustomerAddress[]) => {
        if (cancelled) return;
        setAddresses(data);
        if (data.length === 0) {
          setShowAddressForm(true);
        } else {
          const primary = data.find((a) => a.isPrimary) ?? data[0];
          setSelectedAddressId(primary.id);
        }
      })
      .catch(() => { if (!cancelled) setAddresses([]); });
    return () => { cancelled = true; };
  }, [homeService, selectedCustomer]);

  // Disponibilidade sempre que data/serviço/domicílio mudam
  useEffect(() => {
    if (!isOpen || step !== 3 || !selectedService) return;
    // domicílio: espera um endereço estar selecionado
    if (homeService && !selectedAddressId) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const homeParams = homeService && selectedCustomer
      ? `&homeService=1&customerId=${selectedCustomer.id}&addressId=${selectedAddressId}`
      : '';
    apiFetch(`/availability?date=${date}&serviceId=${selectedService.id}&tz=${tzOffsetMin}${homeParams}`)
      .then((data) => { if (!cancelled) setAvailability(data); })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [isOpen, step, date, selectedService, homeService, selectedAddressId, selectedCustomer]);

  const handleCreateAddress = async () => {
    if (!selectedCustomer) return;
    const a = addressForm;
    if (!a.cep || !a.street || !a.number || !a.neighborhood || !a.city || !a.state) {
      setError('Preencha o endereço completo para o atendimento a domicílio');
      return;
    }
    setSavingAddress(true);
    setError('');
    try {
      const created = await apiFetch(`/customers/${selectedCustomer.id}/addresses`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          ...a,
          isPrimary: addresses.length === 0,
        }),
      });
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm({ ...emptyAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar endereço');
    } finally {
      setSavingAddress(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone ?? '').includes(customerSearch)
  );

  const handleQuickCreate = async () => {
    if (!quickForm.name.trim()) {
      setError('Informe o nome do cliente');
      return;
    }
    setCreatingCustomer(true);
    setError('');
    try {
      const created = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: quickForm.name.trim(),
          phone: quickForm.phone || null,
          email: quickForm.email || null,
        }),
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomer(created);
      setShowQuickCreate(false);
      setQuickForm({ name: '', phone: '', email: '' });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCustomer || !selectedService || !selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          serviceId: selectedService.id,
          scheduledAt: selectedSlot.startAt,
          tzOffsetMin,
          isHomeService: homeService,
          customerAddressId: homeService ? selectedAddressId : null,
          notes: notes.trim() || null,
        }),
      });
      setSuccess(true);
      onAppointmentCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar agendamento');
      // conflito? recarrega a grade
      setStep(3);
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    resetFlow();
  };

  const dateLabel = (() => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  })();

  return (
    <>
      <button className="btn-new-appointment" type="button" onClick={() => (isOpen ? close() : setIsOpen(true))}>
        {isOpen ? 'Fechar' : '+ Novo Agendamento'}
      </button>

      {isOpen && <div className="sched-overlay" onClick={close} />}

      <div className={isOpen ? 'ClientSchedulingFormDesktopOn' : 'ClientSchedulingFormDesktopOff'}>
        <div className="form-container">
          <header className="form-header">
            <div className="sched-header-left">
              {step > 1 && !success && (
                <button className="sched-back" onClick={() => { setStep((s) => (s - 1) as Step); setError(''); }} aria-label="Voltar">
                  <FiChevronLeft size={18} />
                </button>
              )}
              <h2>{success ? 'Agendamento criado' : stepTitles[step]}</h2>
            </div>
            <button className="btn-close" onClick={close} aria-label="Fechar">×</button>
          </header>

          {/* Progresso */}
          {!success && (
            <div className="sched-progress">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`sched-progress-step ${step >= s ? 'done' : ''} ${step === s ? 'current' : ''}`}>
                  <span className="sched-progress-dot">{step > s ? <FiCheck size={11} /> : s}</span>
                  <small>{['Cliente', 'Serviço', 'Horário', 'Confirmar'][s - 1]}</small>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="sched-error">
              <FiX size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* ═══ Sucesso ═══ */}
          {success && (
            <div className="sched-success">
              <div className="sched-success-icon"><FiCheckCircle size={38} /></div>
              <h3>Tudo certo!</h3>
              <p>
                <strong>{selectedCustomer?.name}</strong> agendado para{' '}
                <strong>{dateLabel}</strong> às <strong>{selectedSlot?.time}</strong>.
              </p>
              <div className="sched-success-actions">
                <button className="btn-primary" onClick={() => { resetFlow(); }}>
                  Fazer outro agendamento
                </button>
                <button className="sched-ghost-btn" onClick={close}>Fechar</button>
              </div>
            </div>
          )}

          {/* ═══ Etapa 1: Cliente ═══ */}
          {!success && step === 1 && (
            <div className="sched-body">
              {!showQuickCreate ? (
                <>
                  <div className="sched-search">
                    <FiSearch size={15} />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou telefone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <button className="sched-quickcreate-btn" onClick={() => { setShowQuickCreate(true); setError(''); }}>
                    <FiPlus size={15} /> Cadastrar novo cliente
                  </button>

                  <div className="sched-list">
                    {customers.length === 0 ? (
                      <div className="sched-empty">
                        <FiUser size={22} />
                        <p>Nenhum cliente cadastrado ainda</p>
                        <small>Cadastre o primeiro cliente para agendar.</small>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="sched-empty">
                        <FiSearch size={22} />
                        <p>Nenhum cliente encontrado</p>
                        <small>Tente outro termo ou cadastre um novo cliente.</small>
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          className={`sched-item ${selectedCustomer?.id === c.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedCustomer(c); setStep(2); }}
                        >
                          <span className="sched-avatar"><FiUser size={15} /></span>
                          <span className="sched-item-info">
                            <strong>{c.name}</strong>
                            {c.phone && <small><FiPhone size={10} /> {c.phone}</small>}
                          </span>
                          <FiChevronLeft size={15} className="sched-item-arrow" />
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="sched-quickform">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      autoFocus
                      value={quickForm.name}
                      onChange={(e) => setQuickForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Telefone</label>
                      <input
                        type="tel"
                        value={quickForm.phone}
                        onChange={(e) => setQuickForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={quickForm.email}
                        onChange={(e) => setQuickForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <button className="btn-primary" disabled={creatingCustomer} onClick={handleQuickCreate}>
                    {creatingCustomer ? 'Salvando...' : 'Salvar e continuar'}
                  </button>
                  <button className="sched-ghost-btn" onClick={() => setShowQuickCreate(false)}>
                    Voltar para a busca
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ Etapa 2: Serviço ═══ */}
          {!success && step === 2 && (
            <div className="sched-body">
              <div className="sched-list">
                {services.length === 0 ? (
                  <div className="sched-empty">
                    <FiScissors size={22} />
                    <p>Nenhum serviço ativo</p>
                    <small>Cadastre serviços na aba Serviços.</small>
                  </div>
                ) : (
                  services.map((s) => (
                    <button
                      key={s.id}
                      className={`sched-item sched-service ${selectedService?.id === s.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedService(s); setStep(3); }}
                    >
                      <span className="sched-avatar"><FiScissors size={14} /></span>
                      <span className="sched-item-info">
                        <strong>{s.title}</strong>
                        <small>
                          <FiClock size={10} /> {s.duration} min
                          {s.category ? ` · ${s.category}` : ''}
                        </small>
                      </span>
                      <span className="sched-price">{formatMoney(Number(s.price))}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══ Etapa 3: Data & horário ═══ */}
          {!success && step === 3 && (
            <div className="sched-body">
              {/* Atendimento a domicílio */}
              <label className="sched-check sched-check-card">
                <input
                  type="checkbox"
                  checked={homeService}
                  onChange={(e) => {
                    setHomeService(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedAddressId(null);
                      setShowAddressForm(false);
                    }
                  }}
                />
                <FiHome size={14} /> Atendimento a domicílio
                <small>o deslocamento entra no tempo do atendimento</small>
              </label>

              {homeService && (
                <div className="sched-addressbox">
                  {!showAddressForm && addresses.length > 0 && (
                    <>
                      {addresses.map((a) => (
                        <label key={a.id} className={`sched-address ${selectedAddressId === a.id ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="customer-address"
                            checked={selectedAddressId === a.id}
                            onChange={() => setSelectedAddressId(a.id)}
                          />
                          <span>
                            <strong>{a.street}, {a.number}</strong>
                            <small>{a.neighborhood} · {a.city}/{a.state} · {a.cep}</small>
                          </span>
                          {a.isPrimary && <em className="sched-address-tag">Principal</em>}
                        </label>
                      ))}
                      <button className="sched-quickcreate-btn" onClick={() => setShowAddressForm(true)}>
                        <FiPlus size={13} /> Outro endereço
                      </button>
                    </>
                  )}

                  {showAddressForm && (
                    <div className="sched-quickform">
                      <div className="form-row">
                        <div className="form-group">
                          <label>CEP *</label>
                          <input value={addressForm.cep} onChange={(e) => setAddressForm((p) => ({ ...p, cep: e.target.value }))} placeholder="00000-000" />
                        </div>
                        <div className="form-group">
                          <label>Número *</label>
                          <input value={addressForm.number} onChange={(e) => setAddressForm((p) => ({ ...p, number: e.target.value }))} placeholder="123" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Rua *</label>
                        <input value={addressForm.street} onChange={(e) => setAddressForm((p) => ({ ...p, street: e.target.value }))} placeholder="Rua / Avenida" />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Bairro *</label>
                          <input value={addressForm.neighborhood} onChange={(e) => setAddressForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro" />
                        </div>
                        <div className="form-group">
                          <label>Cidade *</label>
                          <input value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>UF *</label>
                        <input maxLength={2} value={addressForm.state} onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))} placeholder="SP" />
                      </div>
                      <button className="btn-primary" disabled={savingAddress} onClick={handleCreateAddress}>
                        {savingAddress ? 'Salvando...' : 'Salvar endereço'}
                      </button>
                      {addresses.length > 0 && (
                        <button className="sched-ghost-btn" onClick={() => setShowAddressForm(false)}>
                          Usar um endereço existente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="sched-datebar">
                <FiCalendar size={15} />
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                />
                <span className="sched-datebar-label">{dateLabel}</span>
              </div>

              {homeService && !selectedAddressId && !showAddressForm ? (
                <div className="sched-empty">
                  <FiHome size={22} />
                  <p>Selecione o endereço do cliente</p>
                  <small>O endereço é obrigatório para atendimento a domicílio.</small>
                </div>
              ) : loadingSlots ? (
                <div className="sched-slots-skeleton">
                  {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
                </div>
              ) : !availability || !availability.isWorkDay ? (
                <div className="sched-empty">
                  <FiClock size={22} />
                  <p>Sem expediente neste dia</p>
                  <small>Escolha outra data ou ajuste sua jornada nas Configurações.</small>
                </div>
              ) : (
                <>
                  <div className="sched-slots-meta">
                    <span>Expediente {availability.workStart} – {availability.workEnd}</span>
                    {availability.buffer > 0 && <span>Delay de {availability.buffer} min entre atendimentos</span>}
                  </div>
                  {homeService && (availability.travelMinutes ?? 0) > 0 && (
                    <div className="sched-travel-note">
                      <FiHome size={12} /> ≈ {availability.travelMinutes} min de deslocamento incluídos no tempo de cada horário
                    </div>
                  )}
                  {homeService && availability.travelUnavailable && (
                    <div className="sched-travel-note sched-travel-warn">
                      Não foi possível calcular o deslocamento agora — o horário será reservado sem esse acréscimo.
                    </div>
                  )}
                  <div className="sched-slots">
                    {availability.slots.map((slot) => {
                      const disabled = slot.status !== 'available';
                      return (
                        <button
                          key={slot.time}
                          disabled={disabled}
                          title={
                            slot.status === 'occupied' ? 'Ocupado'
                            : slot.status === 'blocked' ? (slot.blockTitle ?? 'Bloqueado')
                            : slot.status === 'past' ? 'Horário passado'
                            : slot.status === 'unavailable' ? 'Serviço não cabe neste horário'
                            : 'Disponível'
                          }
                          className={`sched-slot sched-slot-${slot.status} ${selectedSlot?.time === slot.time ? 'selected' : ''}`}
                          onClick={() => { setSelectedSlot(slot); setStep(4); }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                  <div className="sched-legend">
                    <span><i className="lg lg-available" /> Livre</span>
                    <span><i className="lg lg-occupied" /> Ocupado</span>
                    <span><i className="lg lg-blocked" /> Bloqueado</span>
                    <span><i className="lg lg-past" /> Passado</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ Etapa 4: Confirmação ═══ */}
          {!success && step === 4 && selectedCustomer && selectedService && selectedSlot && (
            <div className="sched-body">
              <div className="sched-summary">
                <div className="sched-summary-row">
                  <FiUser size={14} />
                  <div>
                    <small>Cliente</small>
                    <strong>{selectedCustomer.name}</strong>
                  </div>
                </div>
                <div className="sched-summary-row">
                  <FiScissors size={14} />
                  <div>
                    <small>Serviço</small>
                    <strong>{selectedService.title}</strong>
                    <span>{selectedService.duration} min · {formatMoney(Number(selectedService.price))}</span>
                  </div>
                </div>
                <div className="sched-summary-row">
                  <FiCalendar size={14} />
                  <div>
                    <small>Quando</small>
                    <strong style={{ textTransform: 'capitalize' }}>{dateLabel}</strong>
                    <span>às {selectedSlot.time}</span>
                  </div>
                </div>
                {homeService && (
                  <div className="sched-summary-row">
                    <FiHome size={14} />
                    <div>
                      <small>Domicílio</small>
                      {(() => {
                        const addr = addresses.find((a) => a.id === selectedAddressId);
                        return addr ? (
                          <>
                            <strong>{addr.street}, {addr.number}</strong>
                            <span>{addr.neighborhood} · {addr.city}/{addr.state}</span>
                          </>
                        ) : (
                          <strong>Endereço do cliente</strong>
                        );
                      })()}
                      {(availability?.travelMinutes ?? 0) > 0 && (
                        <span>≈ {availability?.travelMinutes} min de deslocamento incluídos</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais (opcional)"
                />
              </div>

              <button className="btn-primary" disabled={submitting} onClick={handleConfirm}>
                {submitting ? 'Agendando...' : 'Confirmar agendamento'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientSchedulingForm;
