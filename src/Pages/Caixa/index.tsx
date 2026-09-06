import { useEffect, useMemo, useState } from "react";
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
import type { ReactElement } from "react";
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

type ItemType = "service" | "product" | "other";
type PaymentMethod = "dinheiro" | "cartao" | "pix" | "outro";

interface SaleItem {
  id: number;
  type: ItemType;
  serviceId: number | null;
  productId: number | null;
  description: string;
  amount: string;
}

interface CaixaSale {
  id: number;
  customerId: number | null;
  discount: string;
  paymentMethod: PaymentMethod;
  soldAt: string;
  notes: string | null;
  items: SaleItem[];
  subtotal: number;
  total: number;
}

// Item do carrinho antes de salvar (ainda não tem id do banco)
interface CartItem {
  key: string;
  type: ItemType;
  serviceId: number | null;
  productId: number | null;
  description: string;
  amount: string; // string de moeda formatada ("R$ 40,00")
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const paymentMethods: { value: PaymentMethod; label: string; icon: ReactElement }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: <FiDollarSign size={13} /> },
  { value: "cartao", label: "Cartão", icon: <FiCreditCard size={13} /> },
  { value: "pix", label: "Pix", icon: <FiSmartphone size={13} /> },
  { value: "outro", label: "Outro", icon: <FiMoreHorizontal size={13} /> },
];

const paymentLabel = (method: string) =>
  paymentMethods.find((m) => m.value === method)?.label ?? method;

const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// "R$ 40,00" / "4000" -> 40 ; usa os dígitos como centavos
const currencyToNumber = (value: string) => Number(value.replace(/\D/g, "")) / 100;
const formatCurrencyInput = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers === ""
    ? ""
    : (Number(numbers) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const numberToCurrencyInput = (n: number) =>
  formatCurrencyInput(String(Math.round(n * 100)));

const Caixa = () => {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [sales, setSales] = useState<CaixaSale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalByMethod, setTotalByMethod] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [showForm, setShowForm] = useState(false);

  // Carrinho da venda em edição
  const [cart, setCart] = useState<CartItem[]>([]);
  // Sub-formulário "adicionar item"
  const [itemType, setItemType] = useState<ItemType>("service");
  const [itemServiceId, setItemServiceId] = useState("");
  const [itemProductId, setItemProductId] = useState("");
  const [itemOtherDesc, setItemOtherDesc] = useState("");
  const [itemAmount, setItemAmount] = useState("");

  // Dados da venda como um todo
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
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

  const loadSales = () => {
    setLoading(true);
    apiFetch(`/caixa?date=${dayKey(selectedDay)}`)
      .then((data) => {
        setSales(data.sales ?? []);
        setTotal(data.total ?? 0);
        setTotalByMethod(data.totalByMethod ?? {});
      })
      .catch(() => {
        setSales([]);
        setTotal(0);
        setTotalByMethod({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
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

  const nowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const resetItemForm = () => {
    setItemType("service");
    setItemServiceId("");
    setItemProductId("");
    setItemOtherDesc("");
    setItemAmount("");
  };

  const openForm = () => {
    setCart([]);
    resetItemForm();
    setSelectedCustomerId("");
    setDiscount("");
    setPaymentMethod("dinheiro");
    setSaleTime(nowTime());
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  // Ao escolher serviço/produto no sub-form, já sugere o valor cadastrado
  const handlePickService = (id: string) => {
    setItemServiceId(id);
    const svc = services.find((s) => String(s.id) === id);
    if (svc) setItemAmount(numberToCurrencyInput(Number(svc.price)));
  };
  const handlePickProduct = (id: string) => {
    setItemProductId(id);
    const prod = products.find((p) => String(p.id) === id);
    if (prod) setItemAmount(numberToCurrencyInput(Number(prod.price)));
  };

  const addItemToCart = () => {
    setFormError("");
    let description = "";
    let serviceId: number | null = null;
    let productId: number | null = null;

    if (itemType === "service") {
      const svc = services.find((s) => String(s.id) === itemServiceId);
      if (!svc) return setFormError("Escolha um serviço");
      description = svc.title;
      serviceId = svc.id;
    } else if (itemType === "product") {
      const prod = products.find((p) => String(p.id) === itemProductId);
      if (!prod) return setFormError("Escolha um produto");
      description = prod.name;
      productId = prod.id;
    } else {
      if (!itemOtherDesc.trim()) return setFormError("Descreva o item");
      description = itemOtherDesc.trim();
    }

    if (currencyToNumber(itemAmount) <= 0) return setFormError("Informe um valor válido para o item");

    setCart((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: itemType,
        serviceId,
        productId,
        description,
        amount: itemAmount,
      },
    ]);
    resetItemForm();
  };

  const removeCartItem = (key: string) => setCart((prev) => prev.filter((i) => i.key !== key));

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + currencyToNumber(i.amount), 0),
    [cart]
  );
  const discountNumber = currencyToNumber(discount);
  const finalTotal = Math.max(0, subtotal - discountNumber);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setFormError("Adicione ao menos um item à venda");
      return;
    }
    if (!saleTime) {
      setFormError("Informe o horário");
      return;
    }
    if (discountNumber < 0) {
      setFormError("Desconto inválido");
      return;
    }
    if (discountNumber > subtotal) {
      setFormError("O desconto não pode ser maior que o subtotal");
      return;
    }

    setFormError("");
    setSaving(true);
    try {
      await apiFetch("/caixa", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
          paymentMethod,
          soldAt: `${dayKey(selectedDay)}T${saleTime}:00.000Z`,
          discount: discountNumber,
          items: cart.map((i) => ({
            type: i.type,
            serviceId: i.serviceId ?? undefined,
            productId: i.productId ?? undefined,
            description: i.description,
            amount: currencyToNumber(i.amount),
          })),
        }),
      });
      setShowForm(false);
      loadSales();
      setToast({ show: true, type: "success", message: "Venda registrada!" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao registrar venda");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale: CaixaSale) => {
    const label = sale.items.map((i) => i.description).join(", ") || `venda #${sale.id}`;
    if (!window.confirm(`Remover a venda "${label}"?`)) return;
    try {
      await apiFetch(`/caixa/${sale.id}`, { method: "DELETE" });
      loadSales();
    } catch {
      setToast({ show: true, type: "error", message: "Não foi possível remover a venda" });
    }
  };

  const typeIcon = (type: ItemType) => {
    if (type === "service") return <FiScissors size={13} />;
    if (type === "product") return <FiShoppingBag size={13} />;
    return <FiEdit3 size={13} />;
  };

  const itemTypeOptions: { value: ItemType; label: string; icon: ReactElement }[] = [
    { value: "service", label: "Serviço", icon: <FiScissors size={13} /> },
    { value: "product", label: "Produto", icon: <FiShoppingBag size={13} /> },
    { value: "other", label: "Outro", icon: <FiEdit3 size={13} /> },
  ];

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

              {/* ── Adicionar item ── */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                    Adicionar item
                  </label>
                  <div className="flex gap-2">
                    {itemTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setItemType(opt.value);
                          setItemServiceId("");
                          setItemProductId("");
                          setItemOtherDesc("");
                          setItemAmount("");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          itemType === opt.value
                            ? "bg-gray-900 text-white"
                            : "border border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {itemType === "service" && (
                  <select
                    value={itemServiceId}
                    onChange={(e) => handlePickService(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {formatCurrencyDisplay(Number(s.price))}
                      </option>
                    ))}
                  </select>
                )}

                {itemType === "product" && (
                  <select
                    value={itemProductId}
                    onChange={(e) => handlePickProduct(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrencyDisplay(Number(p.price))}
                      </option>
                    ))}
                  </select>
                )}

                {itemType === "other" && (
                  <input
                    type="text"
                    placeholder="Ex: Gorjeta, ajuste, etc."
                    value={itemOtherDesc}
                    onChange={(e) => setItemOtherDesc(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(formatCurrencyInput(e.target.value))}
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={addItemToCart}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <FiPlus size={14} /> Adicionar
                  </button>
                </div>
              </div>

              {/* ── Itens da venda ── */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Itens da venda
                </label>
                {cart.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Nenhum item adicionado ainda.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400 flex-shrink-0">{typeIcon(item.type)}</span>
                          <span className="font-medium text-gray-900 truncate">{item.description}</span>
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-500">
                            {formatCurrencyDisplay(currencyToNumber(item.amount))}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.key)}
                            className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Remover item"
                          >
                            <FiX size={13} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Subtotal / Desconto / Total ── */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrencyDisplay(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">Desconto</span>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={discount}
                    onChange={(e) => setDiscount(formatCurrencyInput(e.target.value))}
                    className="w-32 px-3 py-1.5 text-xs text-right border border-gray-200 rounded-lg outline-none bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrencyDisplay(finalTotal)}</span>
                </div>
              </div>

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

              {/* Horário */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">Horário</label>
                <input
                  type="time"
                  value={saleTime}
                  onChange={(e) => setSaleTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
                />
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

      {/* Lista de vendas do dia */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <FiDollarSign size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhuma venda registrada nesse dia</p>
          <p className="text-xs text-gray-400 mb-6">Clique em "Nova venda" pra lançar a primeira</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-50">
          {sales.map((sale) => {
            const customer = customers.find((c) => c.id === sale.customerId);
            const time = new Date(sale.soldAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            });
            const discountValue = Number(sale.discount);
            return (
              <div key={sale.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500">{time}</span>
                      <span className="text-[11px] text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{paymentLabel(sale.paymentMethod)}</span>
                      {customer && (
                        <>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-xs text-gray-500 truncate">{customer.name}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-gray-900 min-w-0">
                          <span className="text-gray-400 flex-shrink-0">{typeIcon(item.type)}</span>
                          <span className="truncate">{item.description}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatCurrencyDisplay(Number(item.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                    {discountValue > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Subtotal {formatCurrencyDisplay(sale.subtotal)} − desconto{" "}
                        {formatCurrencyDisplay(discountValue)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrencyDisplay(sale.total)}
                    </span>
                    <button
                      onClick={() => handleDelete(sale)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                      title="Remover venda"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Caixa;
