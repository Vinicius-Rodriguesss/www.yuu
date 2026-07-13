import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiDollarSign, FiSave, FiX } from "react-icons/fi";
import Toast from "../../Components/Toast/index";

interface Service {
  id: number;
  title: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  active: boolean;
}

const initialCategories = [
  "Cabelo",
  "Barba",
  "Maquiagem",
  "Unhas",
  "Estética",
  "Massagem",
  "Depilação",
  "Outros"
];

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Cabelo");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error" | "warning"; message: string }>({
    show: false,
    type: "success",
    message: ""
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("http://localhost:3000/services", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const formatted = (Number(numbers) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    return formatted;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, "");
    if (numbers === "") {
      setPrice("");
      return;
    }
    setPrice(formatCurrency(numbers));
  };

  const getPriceNumber = () => {
    return Number(price.replace(/\D/g, "")) / 100;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration(60);
    setPrice("");
    setCategory("Cabelo");
    setCustomCategory("");
    setShowCustomCategory(false);
    setEditingId(null);
  };

  const handleEdit = (service: Service) => {
    setTitle(service.title);
    setDescription(service.description);
    setDuration(service.duration);
    setPrice(formatCurrency(String(Number(service.price) * 100)));
    setCategory(service.category);
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const response = await fetch(`http://localhost:3000/services/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        setServices(services.filter(s => s.id !== id));
        setToast({ show: true, type: "success", message: "Serviço excluído com sucesso!" });
      }
    } catch (error) {
      setToast({ show: true, type: "error", message: "Erro ao excluir serviço" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setToast({ show: true, type: "error", message: "O título do serviço é obrigatório." });
      return;
    }

    if (getPriceNumber() <= 0) {
      setToast({ show: true, type: "error", message: "Informe um valor válido para o serviço." });
      return;
    }

    const finalCategory = category === "Outros" && customCategory.trim() ? customCategory : category;

    const serviceData = {
      title: title.trim(),
      description: description.trim(),
      duration,
      price: getPriceNumber(),
      category: finalCategory,
      active: true
    };

    try {
      const url = editingId
        ? `http://localhost:3000/services/${editingId}`
        : "http://localhost:3000/services";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(serviceData)
      });

      if (response.ok) {
        await fetchServices();
        resetForm();
        setShowForm(false);
        setToast({
          show: true,
          type: "success",
          message: editingId ? "Serviço atualizado com sucesso!" : "Serviço criado com sucesso!"
        });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch (error) {
      setToast({ show: true, type: "error", message: "Erro ao salvar serviço" });
    }
  };

  const toggleServiceStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:3000/services/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ active: !currentStatus })
      });

      if (response.ok) {
        setServices(services.map(s =>
          s.id === id ? { ...s, active: !currentStatus } : s
        ));
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="font-sans">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: "success", message: "" })}
      />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Serviços</h1>
        <p className="text-sm text-gray-400">Gerencie os serviços oferecidos pelo seu negócio</p>

        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-gray-900 text-white border-none px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-opacity hover:opacity-90 mt-4"
        >
          <FiPlus size={16} />
          Novo Serviço
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-7 border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900 m-0">
                {editingId ? "Editar Serviço" : "Novo Serviço"}
              </h2>
              <button
                onClick={closeModal}
                className="bg-transparent border-none p-1.5 cursor-pointer rounded text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Título */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Título do serviço *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corte Masculino"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 box-border transition-colors focus:border-gray-900"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Descrição
                </label>
                <textarea
                  placeholder="Descreva o serviço, o que inclui, etc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 box-border min-h-[80px] resize-y font-sans transition-colors focus:border-gray-900"
                />
              </div>

              {/* Duração e Preço */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <FiClock size={12} />
                    Duração (minutos)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 cursor-pointer transition-colors focus:border-gray-900"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 horas</option>
                    <option value={150}>2h 30min</option>
                    <option value={180}>3 horas</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <FiDollarSign size={12} />
                    Valor *
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={price}
                    onChange={handlePriceChange}
                    className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 box-border transition-colors focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setShowCustomCategory(e.target.value === "Outros");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 cursor-pointer transition-colors focus:border-gray-900"
                >
                  {initialCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {showCustomCategory && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Nome da categoria"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-gray-200 text-sm outline-none bg-white text-gray-900 box-border transition-colors focus:border-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-2.5 justify-end mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 bg-white text-gray-600 border-[1.5px] border-gray-200 px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-gray-900 text-white border-none px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
                >
                  <FiSave size={16} />
                  {editingId ? "Atualizar" : "Salvar Serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Serviços */}
      {services.length === 0 ? (
        <div className="text-center py-16 px-5 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <p className="text-[15px] text-gray-400 mb-1">Nenhum serviço cadastrado</p>
          <p className="text-[13px] text-gray-300">Clique em "Novo Serviço" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 max-w-3xl mx-auto mt-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-[10px] p-6 mb-4 border border-gray-200 transition-all ${
                service.active ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 m-0 mb-1">
                    {service.title}
                  </h3>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                    {service.category}
                  </span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(service)}
                    className="bg-transparent border-none p-1.5 cursor-pointer rounded text-gray-400 hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="bg-transparent border-none p-1.5 cursor-pointer rounded text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {service.description && (
                <p className="text-[13px] text-gray-400 mb-3 leading-relaxed">
                  {service.description}
                </p>
              )}

              <div className="flex items-center gap-4 pt-2.5 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-600 text-[13px]">
                  <FiClock size={14} />
                  <span>{service.duration} min</span>
                </div>

                <div className="text-base font-semibold text-gray-900 ml-auto">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(Number(service.price))}
                </div>
              </div>

              {/* Toggle Ativo/Inativo */}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleServiceStatus(service.id, service.active)}
                  className={`w-full py-1.5 rounded text-xs cursor-pointer transition-all ${
                    service.active
                      ? "border border-green-600 bg-green-50 text-green-600"
                      : "border border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  {service.active ? "✓ Ativo" : "Inativo"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Services;