import { useState, useEffect } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiShoppingBag,
  FiSearch,
} from "react-icons/fi";
import Toast from "../../Components/Toast/index";
import { API_URL } from "@/api/client";

interface Product {
  id: number;
  name: string;
  price: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return (Number(numbers) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, "");
    setPrice(numbers === "" ? "" : formatCurrency(numbers));
  };

  const getPriceNumber = () => Number(price.replace(/\D/g, "")) / 100;

  const resetForm = () => {
    setName("");
    setPrice("");
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setPrice(formatCurrency(String(Number(product.price) * 100)));
    setEditingId(product.id);
    setShowForm(true);
  };

  const openDeleteModal = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      const response = await fetch(`${API_URL}/products/${deletingProduct.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== deletingProduct.id));
        setToast({ show: true, type: "success", message: "Produto excluído com sucesso!" });
        setShowDeleteModal(false);
        setDeletingProduct(null);
      }
    } catch {
      setToast({ show: true, type: "error", message: "Erro ao excluir produto" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setToast({ show: true, type: "error", message: "O nome do produto é obrigatório." });
      return;
    }

    if (getPriceNumber() <= 0) {
      setToast({ show: true, type: "error", message: "Informe um valor válido para o produto." });
      return;
    }

    const productData = {
      name: name.trim(),
      price: getPriceNumber(),
      active: true,
    };

    try {
      const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        await fetchProducts();
        resetForm();
        setShowForm(false);
        setToast({
          show: true,
          type: "success",
          message: editingId ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!",
        });
      } else {
        throw new Error("Erro ao salvar");
      }
    } catch {
      setToast({ show: true, type: "error", message: "Erro ao salvar produto" });
    }
  };

  const toggleProductStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (response.ok) {
        setProducts(products.map((p) => (p.id === id ? { ...p, active: !currentStatus } : p)));
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    resetForm();
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeProducts = filteredProducts.filter((p) => p.active);
  const inactiveProducts = filteredProducts.filter((p) => !p.active);

  if (loading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando produtos...</p>
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
            setDeletingProduct(null);
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
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Excluir produto</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Tem certeza que deseja excluir permanentemente o produto{" "}
                    <strong className="text-gray-900">{deletingProduct?.name}</strong>? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeletingProduct(null);
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Produtos</h1>
          <p className="text-sm text-gray-400">
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado
            {products.length !== 1 ? "s" : ""} • {activeProducts.length} ativo
            {activeProducts.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto..."
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
            <span className="hidden sm:inline">Novo produto</span>
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
                  <FiShoppingBag size={16} className="text-gray-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {editingId ? "Editar produto" : "Novo produto"}
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
                  Nome do produto <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pomada modeladora"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 placeholder:text-gray-300"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block tracking-wide">
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
                  {editingId ? "Atualizar" : "Salvar produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista vazia */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <FiShoppingBag size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Nenhum produto encontrado</p>
          <p className="text-xs text-gray-400 mb-6">
            {searchTerm ? "Tente ajustar a busca" : 'Clique em "Novo produto" para cadastrar o primeiro'}
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
              Criar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-900 transition-colors">
                    <FiShoppingBag size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleEdit(product)}
                    className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(product)}
                    className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrencyDisplay(Number(product.price))}
                </span>
                <button
                  onClick={() => toggleProductStatus(product.id, product.active)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all"
                >
                  Ativo
                </button>
              </div>
            </div>
          ))}

          {inactiveProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-gray-200 p-5 opacity-50 hover:opacity-75 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FiShoppingBag size={16} className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleEdit(product)}
                    className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(product)}
                    className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-600"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrencyDisplay(Number(product.price))}
                </span>
                <button
                  onClick={() => toggleProductStatus(product.id, product.active)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200 transition-all"
                >
                  Inativo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {filteredProducts.length > 0 && (
        <div className="text-center mt-6 mb-2">
          <p className="text-[11px] text-gray-300">
            {activeProducts.length} ativo{activeProducts.length !== 1 ? "s" : ""} •{" "}
            {inactiveProducts.length} inativo{inactiveProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
};

export default Products;
