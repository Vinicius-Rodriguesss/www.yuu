import { useState, useEffect } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiUser,
  FiSearch,
  FiPhone,
  FiMail,
} from "react-icons/fi";
import Toast from "../../Components/Toast/index";
import { apiFetch } from "@/api/client";

interface Customer {
  id: number;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ show: false, type: "success", message: "" });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await apiFetch("/customers");
      setCustomers(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDocument("");
    setPhone("");
    setEmail("");
    setNotes("");
    setEditingId(null);
  };

  const handleEdit = (customer: Customer) => {
    setName(customer.name);
    setDocument(customer.document ?? "");
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
    setEditingId(customer.id);
    setShowForm(true);
  };

  const openDeleteModal = (customer: Customer) => {
    setDeletingCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await apiFetch(`/customers/${deletingCustomer.id}`, { method: "DELETE" });
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      setToast({ show: true, type: "success", message: "Cliente excluído com sucesso!" });
    } catch (error) {
      setToast({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao excluir cliente",
      });
    } finally {
      setShowDeleteModal(false);
      setDeletingCustomer(null);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setToast({ show: true, type: "error", message: "O nome do cliente é obrigatório." });
      return;
    }

    const customerData = {
      name: name.trim(),
      document: document.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (editingId) {
        await apiFetch(`/customers/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(customerData),
        });
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(customerData),
        });
      }
      await fetchCustomers();
      closeModal();
      setToast({
        show: true,
        type: "success",
        message: editingId ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!",
      });
    } catch (error) {
      setToast({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao salvar cliente",
      });
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone ?? "").includes(searchTerm) ||
      (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando clientes...</p>
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

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDeleteModal(false);
            setDeletingCustomer(null);
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
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Excluir cliente</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tem certeza que deseja excluir permanentemente{" "}
                    <strong className="text-gray-900">{deletingCustomer?.name}</strong>? Esta ação não
                    pode ser desfeita.
                  </p>
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeletingCustomer(null);
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-400">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""} cadastrado
            {customers.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, telefone ou email..."
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

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-all flex-shrink-0"
          >
            <FiPlus size={14} />
            <span className="hidden sm:inline">Novo cliente</span>
          </button>
        </div>
      </div>

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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiUser size={16} className="text-gray-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingId ? "Editar cliente" : "Novo cliente"}
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
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                    Documento
                  </label>
                  <input
                    type="text"
                    placeholder="CPF/CNPJ"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
                  Observações
                </label>
                <textarea
                  placeholder="Preferências, alergias, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300 resize-none"
                />
              </div>

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
                  {editingId ? "Atualizar" : "Salvar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista vazia */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <FiUser size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhum cliente encontrado</p>
          <p className="text-xs text-gray-400 mb-6">
            {searchTerm ? "Tente ajustar a busca" : 'Clique em "Novo cliente" para cadastrar o primeiro'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
            >
              <FiPlus size={15} />
              Criar primeiro cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_160px_1fr_80px] gap-4 px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
            <span>Nome</span>
            <span>Telefone</span>
            <span>Email</span>
            <span className="text-center">Ações</span>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_160px_1fr_80px] gap-2 sm:gap-4 px-5 py-4 items-center transition-colors hover:bg-gray-50/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FiUser size={13} className="text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">{customer.name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  {customer.phone && (
                    <>
                      <FiPhone size={12} className="text-gray-400" />
                      {customer.phone}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-sm text-gray-600 truncate">
                  {customer.email && (
                    <>
                      <FiMail size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </>
                  )}
                </div>

                <div className="flex gap-1 justify-end sm:justify-center">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                    title="Editar"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(customer)}
                    className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                    title="Excluir"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
