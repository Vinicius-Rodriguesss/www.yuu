import { useState, useEffect } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiDollarSign,
  FiSave,
  FiX,
  FiScissors,
  FiGrid,
  FiList,
  FiSearch,
  FiTag,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import Toast from "../../Components/Toast/index";

interface Service {
  id: number;
  title: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Paleta de cores para categorias dinâmicas
const categoryPalette = [
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", dot: "bg-lime-500" },
];

const getCategoryColor = (category: string) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % categoryPalette.length;
  return categoryPalette[index];
};

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  // Extrair categorias únicas dos serviços
  useEffect(() => {
    const uniqueCategories = [...new Set(services.map((s) => s.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [services]);

  const fetchServices = async () => {
    try {
      const response = await fetch("http://localhost:3000/services", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const formatted = (Number(numbers) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return formatted;
  };

  const formatCurrencyDisplay = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
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
    setCategory("");
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

  const openDeleteModal = (service: Service) => {
    setDeletingService(service);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingService) return;

    try {
      const response = await fetch(`http://localhost:3000/services/${deletingService.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setServices(services.filter((s) => s.id !== deletingService.id));
        setToast({ show: true, type: "success", message: "Serviço excluído com sucesso!" });
        setShowDeleteModal(false);
        setDeletingService(null);
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

    if (!category.trim()) {
      setToast({ show: true, type: "error", message: "Informe a categoria do serviço." });
      return;
    }

    if (getPriceNumber() <= 0) {
      setToast({ show: true, type: "error", message: "Informe um valor válido para o serviço." });
      return;
    }

    const serviceData = {
      title: title.trim(),
      description: description.trim(),
      duration,
      price: getPriceNumber(),
      category: category.trim(),
      active: true,
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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        await fetchServices();
        resetForm();
        setShowForm(false);
        setToast({
          show: true,
          type: "success",
          message: editingId ? "Serviço atualizado com sucesso!" : "Serviço criado com sucesso!",
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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (response.ok) {
        setServices(
          services.map((s) => (s.id === id ? { ...s, active: !currentStatus } : s))
        );
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    resetForm();
  };

  // Filtrar categorias com base no termo de busca
  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtragem de serviços
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeServices = filteredServices.filter((s) => s.active);
  const inactiveServices = filteredServices.filter((s) => !s.active);

  // Sugerir categorias existentes ao digitar
  const categorySuggestions = category
    ? categories.filter(
        (cat) =>
          cat.toLowerCase().includes(category.toLowerCase()) &&
          cat.toLowerCase() !== category.toLowerCase()
      )
    : [];

  if (loading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: "success", message: "" })}
      />

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDeleteModal(false);
            setDeletingService(null);
          }}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FiTrash2 size={18} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Excluir serviço</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tem certeza que deseja excluir permanentemente o serviço{" "}
                    <strong className="text-gray-900">{deletingService?.title}</strong>? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeletingService(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <FiTrash2 size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Serviços</h1>
          <p className="text-sm text-gray-400">
            {services.length} serviço{services.length !== 1 ? "s" : ""} cadastrado
            {services.length !== 1 ? "s" : ""} • {activeServices.length} ativo
            {activeServices.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Barra de busca */}
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* Toggle visualização */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-all ${
                viewMode === "grid"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              title="Grade"
            >
              <FiGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-all ${
                viewMode === "list"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              title="Lista"
            >
              <FiList size={14} />
            </button>
          </div>

          {/* Botão Novo */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-all flex-shrink-0"
          >
            <FiPlus size={14} />
            <span className="hidden sm:inline">Novo serviço</span>
          </button>
        </div>
      </div>

      {/* Filtros por categoria - só mostra se existirem categorias */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory("Todas")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === "Todas"
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FiTag size={12} />
              Todas
            </span>
          </button>
          {filteredCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            const catColor = getCategoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-white" : catColor.dot
                    }`}
                  />
                  {cat}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiScissors size={16} className="text-gray-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingId ? "Editar serviço" : "Novo serviço"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Título do serviço <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corte Masculino"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  autoFocus
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Categoria <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Cabelo, Barba, Unhas..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                  {/* Sugestões de categorias existentes */}
                  {categorySuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      {categorySuggestions.map((suggestion) => {
                        const sugColor = getCategoryColor(suggestion);
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setCategory(suggestion)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sugColor.dot} flex-shrink-0`} />
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {categories.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">
                    Categorias existentes:{" "}
                    {categories.map((cat, i) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className="text-gray-600 hover:text-gray-900 underline underline-offset-2"
                      >
                        {cat}
                        {i < categories.length - 1 ? ", " : ""}
                      </button>
                    ))}
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Descrição
                </label>
                <textarea
                  placeholder="Descreva o serviço, o que inclui, etc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300 resize-none"
                />
              </div>

              {/* Duração e Preço */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 tracking-wide">
                    <FiClock size={12} />
                    Duração
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none bg-white cursor-pointer transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10"
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

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 tracking-wide">
                    <FiDollarSign size={12} />
                    Valor <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={price}
                    onChange={handlePriceChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
                >
                  <FiSave size={15} />
                  {editingId ? "Atualizar" : "Salvar serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista vazia */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <FiScissors size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhum serviço encontrado</p>
          <p className="text-xs text-gray-400 mb-6">
            {searchTerm || selectedCategory !== "Todas"
              ? "Tente ajustar os filtros de busca"
              : 'Clique em "Novo serviço" para cadastrar o primeiro'}
          </p>
          {!searchTerm && selectedCategory === "Todas" && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
            >
              <FiPlus size={15} />
              Criar primeiro serviço
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Visualização em Grid */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeServices.map((service) => {
                const catColor = getCategoryColor(service.category);
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-900 transition-colors">
                          <FiScissors size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{service.title}</h3>
                          {service.category && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                            >
                              {service.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleEdit(service)}
                          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(service)}
                          className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{service.description}</p>
                    )}
                    {!service.description && <div className="mb-4" />}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FiClock size={12} />
                          {service.duration}min
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrencyDisplay(Number(service.price))}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleServiceStatus(service.id, service.active)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all"
                      >
                        Ativo
                      </button>
                    </div>
                  </div>
                );
              })}

              {inactiveServices.map((service) => {
                const catColor = getCategoryColor(service.category);
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg border border-gray-200 p-5 opacity-50 hover:opacity-75 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <FiScissors size={16} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{service.title}</h3>
                          {service.category && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                            >
                              {service.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleEdit(service)}
                          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(service)}
                          className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{service.description}</p>
                    )}
                    {!service.description && <div className="mb-4" />}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FiClock size={12} />
                          {service.duration}min
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrencyDisplay(Number(service.price))}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleServiceStatus(service.id, service.active)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200 transition-all"
                      >
                        Inativo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visualização em Lista */}
          {viewMode === "list" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_100px_120px_120px_80px] gap-4 px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <span>Serviço</span>
                <span>Duração</span>
                <span>Valor</span>
                <span>Status</span>
                <span className="text-center">Ações</span>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredServices.map((service) => {
                  const catColor = getCategoryColor(service.category);
                  return (
                    <div
                      key={service.id}
                      className={`grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_80px] gap-4 px-5 py-4 items-center transition-colors hover:bg-gray-50/50 ${
                        !service.active ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-900">{service.title}</span>
                        <div className="flex items-center gap-2">
                          {service.category && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                            >
                              {service.category}
                            </span>
                          )}
                          {service.description && (
                            <span className="text-xs text-gray-400 truncate hidden sm:inline max-w-[200px]">
                              {service.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <FiClock size={14} className="text-gray-400" />
                        <span>{service.duration} min</span>
                      </div>

                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrencyDisplay(Number(service.price))}
                      </div>

                      <div>
                        <button
                          onClick={() => toggleServiceStatus(service.id, service.active)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all w-full sm:w-auto ${
                            service.active
                              ? "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                              : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          <span className="sm:hidden flex items-center gap-1">
                            {service.active ? (
                              <>
                                <FiCheckCircle size={12} /> Ativo
                              </>
                            ) : (
                              <>
                                <FiAlertCircle size={12} /> Inativo
                              </>
                            )}
                          </span>
                          <span className="hidden sm:inline">{service.active ? "Ativo" : "Inativo"}</span>
                        </button>
                      </div>

                      <div className="flex gap-1 justify-end sm:justify-center">
                        <button
                          onClick={() => handleEdit(service)}
                          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(service)}
                          className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                          title="Excluir"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      {filteredServices.length > 0 && (
        <div className="text-center mt-6 mb-2">
          <p className="text-[11px] text-gray-300">
            {activeServices.length} ativo{activeServices.length !== 1 ? "s" : ""} •{" "}
            {inactiveServices.length} inativo{inactiveServices.length !== 1 ? "s" : ""} •{" "}
            {categories.length} categoria{categories.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
};

export default Services;