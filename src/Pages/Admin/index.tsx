import { useEffect, useState } from "react";
import { FiDatabase, FiMail, FiCreditCard, FiUsers, FiUserPlus, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearOwnerSession } from "@/api/client";

interface AdminOverview {
  health: { database: boolean; smtp: boolean; stripe: boolean };
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byAccountType: { accountType: string; count: number }[];
    latest: { id: number; name: string; email: string | null; accountType: string; createdAt: string }[];
  };
  subscriptions: { byStatus: { status: string; count: number }[] };
}

interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  document: string;
  accountType: string;
  role: string;
  createdAt: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
}

const statusLabel: Record<string, { label: string; className: string }> = {
  active: { label: "Em dia", className: "bg-emerald-50 text-emerald-700" },
  trialing: { label: "Em teste", className: "bg-blue-50 text-blue-700" },
  past_due: { label: "Atrasado", className: "bg-amber-50 text-amber-700" },
  canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-500" },
  incomplete: { label: "Incompleto", className: "bg-gray-100 text-gray-500" },
  incomplete_expired: { label: "Expirado", className: "bg-gray-100 text-gray-500" },
  unpaid: { label: "Não pago", className: "bg-red-50 text-red-700" },
  sem_assinatura: { label: "Sem assinatura", className: "bg-gray-100 text-gray-400" },
};

const HealthDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch("/admin/overview"), apiFetch("/admin/users")])
      .then(([overviewData, usersData]) => {
        setOverview(overviewData);
        setUsers(usersData.users ?? []);
      })
      .catch((error) => console.error("Erro ao carregar painel admin:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearOwnerSession();
    navigate("/");
  };

  if (loading || !overview) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Painel do administrador</h1>
            <p className="text-sm text-gray-400">Visão geral da plataforma</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <FiLogOut size={16} /> Sair
          </button>
        </div>

        {/* Saúde do sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <FiDatabase size={18} className="text-gray-900" />
            <span className="text-sm text-gray-700 flex-1">Banco de dados</span>
            <HealthDot ok={overview.health.database} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <FiMail size={18} className="text-gray-900" />
            <span className="text-sm text-gray-700 flex-1">Envio de email</span>
            <HealthDot ok={overview.health.smtp} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <FiCreditCard size={18} className="text-gray-900" />
            <span className="text-sm text-gray-700 flex-1">Pagamentos (Stripe)</span>
            <HealthDot ok={overview.health.stripe} />
          </div>
        </div>

        {/* Novos usuários */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUsers size={18} className="text-gray-900" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
            </div>
            <h3 className="text-3xl font-semibold text-gray-900">{overview.users.total}</h3>
            <p className="text-xs text-gray-500">Negócios cadastrados</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUserPlus size={18} className="text-gray-900" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hoje</span>
            </div>
            <h3 className="text-3xl font-semibold text-gray-900">{overview.users.newToday}</h3>
            <p className="text-xs text-gray-500">Novos cadastros</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUserPlus size={18} className="text-gray-900" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">7 dias</span>
            </div>
            <h3 className="text-3xl font-semibold text-gray-900">{overview.users.newThisWeek}</h3>
            <p className="text-xs text-gray-500">Novos cadastros</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiUserPlus size={18} className="text-gray-900" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mês</span>
            </div>
            <h3 className="text-3xl font-semibold text-gray-900">{overview.users.newThisMonth}</h3>
            <p className="text-xs text-gray-500">Novos cadastros</p>
          </div>
        </div>

        {/* Mensalidades por status */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Mensalidades</h2>
          <div className="flex flex-wrap gap-3">
            {overview.subscriptions.byStatus.length === 0 && (
              <span className="text-xs text-gray-400">Nenhuma assinatura registrada ainda.</span>
            )}
            {overview.subscriptions.byStatus.map((s) => {
              const meta = statusLabel[s.status] ?? { label: s.status, className: "bg-gray-100 text-gray-500" };
              return (
                <span key={s.status} className={`text-xs font-medium px-3 py-1.5 rounded-full ${meta.className}`}>
                  {meta.label}: {s.count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Lista de negócios */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-900 p-5 pb-0 mb-4">Negócios cadastrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-t border-gray-100">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Cadastro</th>
                  <th className="px-5 py-3 font-medium">Mensalidade</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const meta = statusLabel[u.subscriptionStatus] ?? {
                    label: u.subscriptionStatus,
                    className: "bg-gray-100 text-gray-500",
                  };
                  return (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-gray-900">{u.name}</td>
                      <td className="px-5 py-3 text-gray-500">{u.email ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{u.accountType}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
