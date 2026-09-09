import { useEffect, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiX,
  FiHome,
  FiCheck,
  FiSearch,
} from "react-icons/fi";
import { apiFetch, tzOffsetMin } from "@/api/client";
import { formatPhone } from "@/SignUp/passwordValidation";
import Toast from "@/Components/Toast";
import "./index.css";

/* ------------------------------------------------------------------ *
 * Versão MOBILE do /calendar — lista de cards do dia.
 * Componente à parte, auto-contido: não compartilha estado com a grade
 * do desktop (CalendarDesktop.tsx). Usa os mesmos endpoints do backend.
 * Escopo v1: ver agenda do dia, navegar dias, mini-calendário, detalhe
 * do agendamento, mudar status e criar novo agendamento.
 * ------------------------------------------------------------------ */

// --- Tipos (espelham os do CalendarDesktop, copiados p/ manter o desktop intocado) ---
interface Customer {
  id: number;
  name: string;
  phone?: string;
  document?: string | null;
}

interface Service {
  id: number;
  title: string;
  duration: number;
  price: string;
  active?: boolean;
}

interface Product {
  id: number;
  name: string;
  price: string;
  active: boolean;
}

interface AppointmentProduct {
  productId: number | null;
  name: string;
  unitPrice: string;
  quantity: number;
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
  products?: AppointmentProduct[];
}

// Cor de fundo por status (igual desktop)
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

// Transições de status oferecidas no detalhe
const statusActions: { status: string; label: string }[] = [
  { status: "confirmed", label: "Confirmar" },
  { status: "in_progress", label: "Iniciar atendimento" },
  { status: "completed", label: "Finalizar" },
  { status: "no_show", label: "Não compareceu" },
  { status: "cancelled", label: "Cancelar" },
];

const weekDaysShort = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const monthNamesShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthNamesFull = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Chave yyyy-mm-dd (mesma do desktop)
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const pad2 = (n: number) => String(n).padStart(2, "0");

// scheduledAt é "hora de parede" com sufixo Z — lê-se com getUTC*
const apptStartMinutes = (a: Appointment) => {
  const d = new Date(a.scheduledAt);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const minutesToLabel = (mins: number) => `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;

const priceLabel = (v: string | number) => {
  const n = Number(v);
  return Number.isFinite(n) ? `R$ ${n.toFixed(2).replace(".", ",")}` : "";
};

// Grade de 6 semanas (segunda a domingo) do mês do cursor
const buildMonthGrid = (cursor: Date): Date[] => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(year, month, 1 - startOffset + i));
  }
  return days;
};

const CalendarMobile = () => {
  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success" | "warning" | "info"; message: string }>(
    { show: false, type: "error", message: "" }
  );
  const showError = (message: string) => setToast({ show: true, type: "error", message });
  const showOk = (message: string) => setToast({ show: true, type: "success", message });

  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // mini-calendário
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  // detalhe (bottom sheet)
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // criar
  const [createOpen, setCreateOpen] = useState(false);

  // --- carga inicial de clientes / serviços / produtos ---
  useEffect(() => {
    Promise.all([apiFetch("/customers"), apiFetch("/services"), apiFetch("/products")])
      .then(([custs, servs, prods]) => {
        setCustomers(custs);
        setServices(servs.filter((s: Service) => s.active !== false));
        setProducts(prods.filter((p: Product) => p.active));
      })
      .catch(() => showError("Erro ao carregar clientes e serviços"));
  }, []);

  // --- agendamentos do dia ---
  const loadAppointments = () => {
    setLoading(true);
    apiFetch(`/appointments?date=${dayKey(selectedDay)}`)
      .then((list: Appointment[]) => setAppointments(list))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => apptStartMinutes(a) - apptStartMinutes(b)),
    [appointments]
  );

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? "Cliente";
  const customerById = (id: number) => customers.find((c) => c.id === id);
  const serviceTitle = (id: number) => services.find((s) => s.id === id)?.title ?? "Serviço";

  const changeDay = (delta: number) => {
    setSelectedDay((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };
  const goToday = () => setSelectedDay(new Date());

  const openMonthPicker = () => {
    setMonthCursor(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
    setMonthPickerOpen(true);
  };
  const pickDay = (d: Date) => {
    setSelectedDay(d);
    setMonthPickerOpen(false);
  };

  const isToday = dayKey(selectedDay) === dayKey(new Date());
  const headerLabel = `${weekDaysShort[(selectedDay.getDay() + 6) % 7]}, ${pad2(selectedDay.getDate())} ${monthNamesShort[selectedDay.getMonth()]}`;

  // --- mudar status ---
  const changeStatus = async (id: number, status: string) => {
    setUpdatingStatus(true);
    try {
      await apiFetch(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setDetail(null);
      showOk("Status atualizado");
      loadAppointments();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erro ao atualizar agendamento");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="cal-mob">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Cabeçalho: navegação de dia + abrir mini-calendário */}
      <header className="cal-mob-header">
        <button className="cal-mob-nav" onClick={() => changeDay(-1)} aria-label="Dia anterior">
          <FiChevronLeft />
        </button>

        <button className="cal-mob-date" onClick={openMonthPicker}>
          <span>{headerLabel}</span>
          <FiChevronDown />
        </button>

        <button className="cal-mob-nav" onClick={() => changeDay(1)} aria-label="Próximo dia">
          <FiChevronRight />
        </button>
      </header>

      {!isToday && (
        <button className="cal-mob-today" onClick={goToday}>
          Voltar para hoje
        </button>
      )}

      {/* Lista de cards */}
      <div className="cal-mob-list">
        {loading ? (
          <p className="cal-mob-empty">Carregando…</p>
        ) : sortedAppointments.length === 0 ? (
          <p className="cal-mob-empty">Nenhum agendamento nesse dia</p>
        ) : (
          sortedAppointments.map((appt) => {
            const start = apptStartMinutes(appt);
            return (
              <button key={appt.id} className="cal-mob-card" onClick={() => setDetail(appt)}>
                <div className="cal-mob-card-time">
                  <strong>{minutesToLabel(start)}</strong>
                  <span>{minutesToLabel(start + appt.duration)}</span>
                </div>
                <span className="cal-mob-card-bar" style={{ backgroundColor: statusColors[appt.status] ?? "#999" }} />
                <div className="cal-mob-card-body">
                  <div className="cal-mob-card-name">
                    {customerName(appt.customerId)}
                    {appt.isHomeService && <FiHome className="cal-mob-home" title="A domicílio" />}
                  </div>
                  <div className="cal-mob-card-sub">
                    {serviceTitle(appt.serviceId)}
                    {appt.price ? ` · ${priceLabel(appt.price)}` : ""}
                  </div>
                  <span className="cal-mob-status" style={{ color: statusColors[appt.status] ?? "#999" }}>
                    {statusLabels[appt.status] ?? appt.status}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* FAB novo agendamento */}
      <button className="cal-mob-fab" onClick={() => setCreateOpen(true)} aria-label="Novo agendamento">
        <FiPlus />
      </button>

      {/* Mini-calendário */}
      {monthPickerOpen && (
        <MonthPicker
          cursor={monthCursor}
          selectedDay={selectedDay}
          onCursorChange={setMonthCursor}
          onPick={pickDay}
          onClose={() => setMonthPickerOpen(false)}
        />
      )}

      {/* Detalhe do agendamento */}
      {detail && (
        <DetailSheet
          appt={detail}
          customer={customerById(detail.customerId)}
          serviceTitle={serviceTitle(detail.serviceId)}
          updating={updatingStatus}
          onChangeStatus={changeStatus}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Criar agendamento */}
      {createOpen && (
        <CreateSheet
          day={selectedDay}
          customers={customers}
          services={services}
          products={products}
          onCustomerCreated={(c) => setCustomers((prev) => [...prev, c])}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            showOk("Agendamento criado");
            loadAppointments();
          }}
          onError={showError}
        />
      )}
    </div>
  );
};

/* ================================ Mini-calendário ================================ */

const MonthPicker = ({
  cursor,
  selectedDay,
  onCursorChange,
  onPick,
  onClose,
}: {
  cursor: Date;
  selectedDay: Date;
  onCursorChange: (d: Date) => void;
  onPick: (d: Date) => void;
  onClose: () => void;
}) => {
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const todayKey = dayKey(new Date());
  const selKey = dayKey(selectedDay);

  return (
    <div className="cal-mob-backdrop" onClick={onClose}>
      <div className="cal-mob-sheet cal-mob-month" onClick={(e) => e.stopPropagation()}>
        <div className="cal-mob-month-head">
          <button
            onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Mês anterior"
          >
            <FiChevronLeft />
          </button>
          <strong>
            {monthNamesFull[cursor.getMonth()]} {cursor.getFullYear()}
          </strong>
          <button
            onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Próximo mês"
          >
            <FiChevronRight />
          </button>
        </div>

        <div className="cal-mob-month-grid">
          {weekDaysShort.map((d) => (
            <span key={d} className="cal-mob-month-wd">
              {d}
            </span>
          ))}
          {grid.map((d) => {
            const k = dayKey(d);
            const otherMonth = d.getMonth() !== cursor.getMonth();
            return (
              <button
                key={k}
                className={[
                  "cal-mob-month-day",
                  otherMonth ? "is-muted" : "",
                  k === todayKey ? "is-today" : "",
                  k === selKey ? "is-selected" : "",
                ].join(" ")}
                onClick={() => onPick(d)}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ================================ Detalhe ================================ */

const DetailSheet = ({
  appt,
  customer,
  serviceTitle,
  updating,
  onChangeStatus,
  onClose,
}: {
  appt: Appointment;
  customer?: Customer;
  serviceTitle: string;
  updating: boolean;
  onChangeStatus: (id: number, status: string) => void;
  onClose: () => void;
}) => {
  const start = apptStartMinutes(appt);
  return (
    <div className="cal-mob-backdrop" onClick={onClose}>
      <div className="cal-mob-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cal-mob-sheet-head">
          <strong>Agendamento</strong>
          <button onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <div className="cal-mob-sheet-body">
          <span className="cal-mob-status-pill" style={{ backgroundColor: statusColors[appt.status] ?? "#999" }}>
            {statusLabels[appt.status] ?? appt.status}
          </span>

          <div className="cal-mob-row">
            <span>Cliente</span>
            <strong>{customer?.name ?? "Cliente"}</strong>
          </div>
          {customer?.phone && (
            <div className="cal-mob-row">
              <span>Telefone</span>
              <strong>{formatPhone(customer.phone)}</strong>
            </div>
          )}
          <div className="cal-mob-row">
            <span>Serviço</span>
            <strong>{serviceTitle}</strong>
          </div>
          <div className="cal-mob-row">
            <span>Horário</span>
            <strong>
              {minutesToLabel(start)} – {minutesToLabel(start + appt.duration)} ({appt.duration} min)
            </strong>
          </div>
          {appt.price ? (
            <div className="cal-mob-row">
              <span>Valor</span>
              <strong>{priceLabel(appt.price)}</strong>
            </div>
          ) : null}
          {appt.isHomeService && (
            <div className="cal-mob-row">
              <span>Local</span>
              <strong>A domicílio</strong>
            </div>
          )}
          {appt.products && appt.products.length > 0 && (
            <div className="cal-mob-row cal-mob-row-col">
              <span>Produtos</span>
              <div>
                {appt.products.map((p, i) => (
                  <div key={i} className="cal-mob-prod-line">
                    {p.quantity}× {p.name} <span>{priceLabel(p.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {appt.notes && (
            <div className="cal-mob-row cal-mob-row-col">
              <span>Observações</span>
              <p>{appt.notes}</p>
            </div>
          )}
        </div>

        <div className="cal-mob-sheet-actions">
          {statusActions
            .filter((a) => a.status !== appt.status)
            .map((a) => (
              <button
                key={a.status}
                disabled={updating}
                onClick={() => onChangeStatus(appt.id, a.status)}
                className={a.status === "cancelled" || a.status === "no_show" ? "is-danger" : ""}
              >
                {a.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

/* ================================ Criar ================================ */

const CreateSheet = ({
  day,
  customers,
  services,
  products,
  onCustomerCreated,
  onClose,
  onCreated,
  onError,
}: {
  day: Date;
  customers: Customer[];
  services: Service[];
  products: Product[];
  onCustomerCreated: (c: Customer) => void;
  onClose: () => void;
  onCreated: () => void;
  onError: (m: string) => void;
}) => {
  const [custId, setCustId] = useState("");
  const [custQuery, setCustQuery] = useState("");
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustDoc, setNewCustDoc] = useState("");
  const [creatingCust, setCreatingCust] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(dayKey(day));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");

  const [isHomeService, setIsHomeService] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<{ productId: number; quantity: number }[]>([]);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // serviço define duração e preço (igual desktop)
  useEffect(() => {
    const svc = services.find((s) => String(s.id) === serviceId);
    if (svc) {
      setDuration(String(svc.duration));
      setPrice(svc.price);
    }
  }, [serviceId, services]);

  // endereços do cliente quando "a domicílio"
  useEffect(() => {
    if (!isHomeService || !custId) {
      setAddresses([]);
      setAddressId(null);
      return;
    }
    apiFetch(`/customers/${custId}/addresses`)
      .then((list: CustomerAddress[]) => {
        setAddresses(list);
        setAddressId(list.find((a) => a.isPrimary)?.id ?? list[0]?.id ?? null);
      })
      .catch(() => setAddresses([]));
  }, [isHomeService, custId]);

  const filteredCustomers = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.document ?? "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [custQuery, customers]);

  const quickCreateCustomer = async () => {
    if (!newCustName.trim()) {
      setError("Informe o nome do cliente");
      return;
    }
    setCreatingCust(true);
    setError("");
    try {
      const created: Customer = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: newCustName.trim(),
          document: newCustDoc.trim() || null,
          phone: newCustPhone.trim() || null,
          email: null,
          notes: null,
        }),
      });
      onCustomerCreated(created);
      setCustId(String(created.id));
      setShowNewCust(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustDoc("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar cliente");
    } finally {
      setCreatingCust(false);
    }
  };

  const setProductQty = (productId: number, quantity: number) => {
    setSelectedProducts((prev) => {
      if (quantity <= 0) return prev.filter((p) => p.productId !== productId);
      const exists = prev.find((p) => p.productId === productId);
      if (exists) return prev.map((p) => (p.productId === productId ? { ...p, quantity } : p));
      return [...prev, { productId, quantity }];
    });
  };

  const submit = async () => {
    if (!custId || !serviceId || !date || !time) {
      setError("Preencha cliente, serviço, data e horário");
      return;
    }
    if (isHomeService && !addressId) {
      setError("Selecione o endereço para o atendimento a domicílio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          customerId: Number(custId),
          serviceId: Number(serviceId),
          scheduledAt: `${date}T${time}:00.000Z`,
          tzOffsetMin,
          duration: Number(duration),
          price,
          products: selectedProducts.filter((p) => p.quantity > 0),
          paymentStatus,
          isHomeService,
          customerAddressId: isHomeService ? addressId : null,
          notes: notes.trim() || null,
        }),
      });
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao criar agendamento";
      setError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => String(c.id) === custId);

  return (
    <div className="cal-mob-backdrop" onClick={onClose}>
      <div className="cal-mob-sheet cal-mob-create" onClick={(e) => e.stopPropagation()}>
        <div className="cal-mob-sheet-head">
          <strong>Novo agendamento</strong>
          <button onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <div className="cal-mob-sheet-body">
          {/* Cliente */}
          <label className="cal-mob-label">Cliente</label>
          {selectedCustomer ? (
            <div className="cal-mob-picked">
              <span>{selectedCustomer.name}</span>
              <button onClick={() => setCustId("")}>trocar</button>
            </div>
          ) : (
            <>
              <div className="cal-mob-search">
                <FiSearch />
                <input
                  placeholder="Buscar por nome ou CPF"
                  value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                />
              </div>
              <div className="cal-mob-cust-list">
                {filteredCustomers.map((c) => (
                  <button key={c.id} onClick={() => setCustId(String(c.id))}>
                    {c.name}
                    {c.phone ? <span>{formatPhone(c.phone)}</span> : null}
                  </button>
                ))}
              </div>
              <button className="cal-mob-link" onClick={() => setShowNewCust((v) => !v)}>
                {showNewCust ? "Cancelar novo cliente" : "+ Cadastrar novo cliente"}
              </button>
              {showNewCust && (
                <div className="cal-mob-newcust">
                  <input placeholder="Nome*" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                  <input
                    placeholder="Telefone"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                  <input placeholder="CPF" value={newCustDoc} onChange={(e) => setNewCustDoc(e.target.value)} />
                  <button disabled={creatingCust} onClick={quickCreateCustomer}>
                    {creatingCust ? "Salvando…" : "Salvar cliente"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Serviço */}
          <label className="cal-mob-label">Serviço</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecione…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.duration} min · {priceLabel(s.price)}
              </option>
            ))}
          </select>

          {/* Data / hora */}
          <div className="cal-mob-2col">
            <div>
              <label className="cal-mob-label">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="cal-mob-label">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="cal-mob-2col">
            <div>
              <label className="cal-mob-label">Duração (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="cal-mob-label">Valor (R$)</label>
              <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          {/* Pagamento */}
          <label className="cal-mob-label">Pagamento</label>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="unpaid">Não pago</option>
            <option value="paid">Pago</option>
          </select>

          {/* A domicílio */}
          <label className="cal-mob-check">
            <input type="checkbox" checked={isHomeService} onChange={(e) => setIsHomeService(e.target.checked)} />
            Atendimento a domicílio
          </label>
          {isHomeService && (
            <>
              {addresses.length === 0 ? (
                <p className="cal-mob-hint">
                  Este cliente não tem endereço cadastrado. Cadastre em Clientes (no desktop) para usar aqui.
                </p>
              ) : (
                <select
                  value={addressId ?? ""}
                  onChange={(e) => setAddressId(e.target.value ? Number(e.target.value) : null)}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.street}, {a.number} — {a.neighborhood}, {a.city}/{a.state}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Produtos */}
          {products.length > 0 && (
            <>
              <label className="cal-mob-label">Produtos (opcional)</label>
              <div className="cal-mob-prods">
                {products.map((p) => {
                  const qty = selectedProducts.find((sp) => sp.productId === p.id)?.quantity ?? 0;
                  return (
                    <div key={p.id} className="cal-mob-prod">
                      <span>
                        {p.name}
                        <em>{priceLabel(p.price)}</em>
                      </span>
                      <div className="cal-mob-stepper">
                        <button onClick={() => setProductQty(p.id, qty - 1)} disabled={qty === 0}>
                          –
                        </button>
                        <span>{qty}</span>
                        <button onClick={() => setProductQty(p.id, qty + 1)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Observações */}
          <label className="cal-mob-label">Observações</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <p className="cal-mob-error">{error}</p>}
        </div>

        <div className="cal-mob-sheet-actions">
          <button className="cal-mob-primary" disabled={saving} onClick={submit}>
            {saving ? "Agendando…" : (
              <>
                <FiCheck /> Agendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarMobile;
