import { useEffect, useState } from "react";
import {
  FiPlus,
  FiX,
  FiSave,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiMoreHorizontal,
  FiScissors,
  FiShoppingBag,
  FiEdit3,
} from "react-icons/fi";
import Toast from "@/Components/Toast";
import { apiFetch } from "@/api/client";

interface Service {
  id: number;
  title: string;
  price: string;
  active: boolean;
}

interface Product {
  id: number;
  name: string;
  price: string;
  active: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface CaixaEntry {
  id: number;
  type: "service" | "product" | "other";
  serviceId: number | null;
  productId: number | null;
  customerId: number | null;
  description: string;
  amount: string;
  paymentMethod: "dinheiro" | "cartao" | "pix" | "outro";
  soldAt: string;
  notes: string | null;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const paymentMethods: { value: CaixaEntry["paymentMethod"]; label: string; icon: JSX.Element }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: <FiDollarSign size={13} /> },
  { value: "cartao", label: "Cartão", icon: <FiCreditCard size={13} /> },
  { value: "pix", label: "Pix", icon: <FiSmartphone size={13} /> },
  { value: "outro", label: "Outro", icon: <FiMoreHorizontal size={13} /> },
];

const paymentLabel = (method: string) =>
  paymentMethods.find((m) => m.value === method)?.label ?? method;

const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Caixa = () => {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [entries, setEntries] = useState<CaixaEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalByMethod, setTotalByMethod] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [saleType, setSaleType] = useState<"service" | "product" | "other">("service");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CaixaEntry["paymentMethod"]>("dinheiro");
  const [saleTime, setSaleTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toast, setToast] = useState<{ show: boolean; type: "error" | "success"; message: string }>(
    { show: false, type: "error", message: "" }
  );

  useEffect(() => {
    Promise.all([apiFetch("/services"), apiFetch("/products"), apiFetch("/customers")])
      .then(([servicesData, productsData, customersData]) => {
        setServices(servicesData.filter((s: Service) => s.active));
        setProducts(productsData.filter((p: Product) => p.active));
        setCustomers(customersData);
      })
      .catch(() => {});
  }, []);

  const loadEntries = () => {
    setLoading(true);
    apiFetch(`/caixa?date=${dayKey(selectedDay)}`)
      .then((data) => {
        setEntries(data.entries);
        setTotal(data.total);
        setTotalByMethod(data.totalByMethod);
      })
      .catch(() => {
        setEntries([]);
        setTotal(0);
        setTotalByMethod({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const changeDay = (delta: number) => {
    setSelectedDay((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const dayLabel = selectedDay.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers === "" ? "" : (Number(numbers) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getAmountNumber = () => Number(amount.replace(/\D/g, "")) / 100;

  const nowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const openForm = () => {
    setSaleType("service");
    setSelectedServiceId("");
    setSelectedProductId("");
    setOtherDescription("");
    setSelectedCustomerId("");
    setAmount("");
    setPaymentMethod("dinheiro");
    setSaleTime(nowTime());
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleSelectService = (service: Service) => {
    setSelectedServiceId(String(service.id));
    setAmount(formatCurrencyInput(String(Math.round(Number(service.price) * 100))));
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(String(product.id));
    setAmount(formatCurrencyInput(String(Math.round(Number(product.price) * 100))));
  };

  const handleSubmit = async () => {
    let description: string;
    if (saleType === "service") {
      const service = services.find((s) => String(s.id) === selectedServiceId);
      if (!service) {
        setFormError("Escolha um serviço");
        return;
      }
      description = service.title;
    } else if (saleType === "product") {
      const product = products.find((p) => String(p.id) === selectedProductId);
      if (!product) {
        setFormError("Escolha um produto");
        return;
      }
      description = product.name;
    } else {
      if (!otherDescription.trim()) {
        setFormError("Descreva a venda");
        return;
      }
      description = otherDescription.trim();
    }

    if (getAmountNumber() <= 0) {
      setFormError("Informe um valor válido");
      return;
    }
    if (!saleTime) {
      setFormError("Informe o horário");
      return;
    }

    setFormError("");
    setSaving(true);
    try {
      await apiFetch("/caixa", {
        method: "POST",
        body: JSON.stringify({
          type: saleType,
          serviceId: saleType === "service" ? Number(selectedServiceId) : undefined,
          productId: saleType === "product" ? Number(selectedProductId) : undefined,
          customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
          description,
          amount: getAmountNumber(),
          paymentMethod,
          soldAt: `${dayKey(selectedDay)}T${saleTime}:00.000Z`,
        }),
      });
      setShowForm(false);
      loadEntries();
      setToast({ show: true, type: "success", message: "Venda registrada!" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao registrar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: CaixaEntry) => {
    if (!window.confirm(`Remover o lançamento "${entry.description}"?`)) return;
    try {
      await apiFetch(`/caixa/${entry.id}`, { method: "DELETE" });
      loadEntries();
    } catch {
      setToast({ show: true, type: "error", message: "Não foi possível remover o lançamento" });
    }
  };

  const typeIcon = (type: CaixaEntry["type"]) => {
    if (type === "service") return <FiScissors size={13} />;
    if (type === "product") return <FiShoppingBag size={13} />;
    return <FiEdit3 size={13} />;
  };

  return (
    <div className="font-sans">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Caixa</h1>
          <p className="text-sm text-gray-400 capitalize">{dayLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => changeDay(-1)}
              className="p-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Dia anterior"
            >
              <FiChevronLeft size={15} />
            </button>
            <button
              onClick={() => setSelectedDay(new Date())}
              className="px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-x border-gray-200"
            >
              Hoje
            </button>
            <button
              onClick={() => changeDay(1)}
              className="p-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Próximo dia"
            >
              <FiChevronRight size={15} />
            </button>
          </div>

          <button
            onClick={openForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-all flex-shrink-0"
          >
            <FiPlus size={14} />
            Nova venda
          </button>
        </div>
      </div>

      {/* Totais do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 sm:col-span-1 bg-gray-900 rounded-lg p-4">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Total do dia</p>
          <p className="text-xl font-semibold text-white">{formatCurrencyDisplay(total)}</p>
        </div>
        {paymentMethods.map((method) => (
          <div key={method.value} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              {method.icon} {method.label}
            </p>
            <p className="text-base font-semibold text-gray-900">
              {formatCurrencyDisplay(totalByMethod[method.value] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Modal de nova venda */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Nova venda</h2>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Tipo</label>
                <div className="flex gap-2">
                  {[
                    { value: "service" as const, label: "Serviço", icon: <FiScissors size={13} /> },
                    { value: "product" as const, label: "Produto", icon: <FiShoppingBag size={13} /> },
                    { value: "other" as const, label: "Outro", icon: <FiEdit3 size={13} /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSaleType(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        saleType === opt.value
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de serviço/produto/descrição livre */}
              {saleType === "service" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Serviço</label>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {services.length === 0 && (
                      <p className="text-xs text-gray-400">Nenhum serviço ativo cadastrado</p>
                    )}
                    {services.map((service) => {
                      const active = selectedServiceId === String(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectService(service)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-xs transition-all ${
                            active ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="font-medium text-gray-900">{service.title}</span>
                          <span className="text-gray-400">{formatCurrencyDisplay(Number(service.price))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {saleType === "product" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Produto</label>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {products.length === 0 && (
                      <p className="text-xs text-gray-400">Nenhum produto ativo cadastrado</p>
                    )}
                    {products.map((product) => {
                      const active = selectedProductId === String(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-xs transition-all ${
                            active ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <span className="text-gray-400">{formatCurrencyDisplay(Number(product.price))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {saleType === "other" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Gorjeta, ajuste, etc."
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
              )}

              {/* Cliente (opcional) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Cliente <span className="text-gray-300 font-normal">(opcional)</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                >
                  <option value="">Sem cliente vinculado</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` — ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor e horário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Valor</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={amount}
                    onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Horário</label>
                  <input
                    type="time"
                    value={saleTime}
                    onChange={(e) => setSaleTime(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Forma de pagamento
                </label>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        paymentMethod === method.value
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {method.icon} {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  <FiSave size={15} />
                  {saving ? "Salvando..." : "Registrar venda"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de lançamentos do dia */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <FiDollarSign size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma venda registrada nesse dia</p>
          <p className="text-xs text-gray-400 mb-6">Clique em "Nova venda" pra lançar a primeira</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[70px_1fr_160px_120px_100px_50px] gap-4 px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
            <span>Hora</span>
            <span>Descrição</span>
            <span>Cliente</span>
            <span>Pagamento</span>
            <span>Valor</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {entries.map((entry) => {
              const customer = customers.find((c) => c.id === entry.customerId);
              const time = new Date(entry.soldAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              });
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[70px_1fr_160px_120px_100px_50px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-sm text-gray-500 hidden sm:inline">{time}</span>
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900 min-w-0">
                    <span className="text-gray-400 flex-shrink-0">{typeIcon(entry.type)}</span>
                    <span className="truncate">{entry.description}</span>
                    <span className="text-xs text-gray-400 sm:hidden flex-shrink-0">{time}</span>
                  </span>
                  <span className="text-xs text-gray-500 hidden sm:inline truncate">
                    {customer?.name ?? "—"}
                  </span>
                  <span className="text-xs text-gray-500 hidden sm:inline">{paymentLabel(entry.paymentMethod)}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrencyDisplay(Number(entry.amount))}
                  </span>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600 justify-self-end"
                    title="Remover"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;
