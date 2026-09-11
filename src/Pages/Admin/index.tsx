import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiSearch,
  FiLogOut,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { apiFetch, clearOwnerSession } from "@/api/client";

// ---------- tipos ----------
interface Overview {
  negocios: { total: number; estabelecimentos: number; profissionais: number; novos30d: number };
  agendamentos: { total: number; concluidos: number; cancelados: number };
  clientes: number;
  receita: { atendimentos: number; caixa: number; total: number };
}

interface BusinessRow {
  id: number;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  accountType: string;
  businessType: string;
  publicSlug: string | null;
  createdAt: string;
  appointmentsCount: number;
  customersCount: number;
  lastAppointmentAt: string | null;
}

interface BusinessDetail extends BusinessRow {
  role: string;
  homeService: boolean;
  lastVerifiedAt: string | null;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  stats: {
    agendamentos: { total: number; concluidos: number; cancelados: number };
    receitaAtendimentos: number;
    clientes: number;
    servicos: { total: number; ativos: number };
    produtos: { total: number; ativos: number };
    vendasCaixa: number;
  };
  ultimosAgendamentos: {
    id: number;
    scheduledAt: string;
    status: string;
    price: string;
    customerName: string | null;
    serviceTitle: string | null;
  }[];
}

// ---------- helpers ----------
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const dataCurta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

const formatDoc = (d: string) => {
  const n = (d || "").replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return d;
};

const tipoLabel = (t: string) => (t === "establishment" ? "Estabelecimento" : "Profissional");

const PAGE_SIZE = 20;

// ---------- componente ----------
const Admin = () => {
  const navigate = useNavigate();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<BusinessDetail | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  const carregar = useCallback(async (busca: string, off: number) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (busca.trim()) params.set("q", busca.trim());
      const [ov, lista] = await Promise.all([
        apiFetch("/admin/overview"),
        apiFetch(`/admin/businesses?${params.toString()}`),
      ]);
      setOverview(ov);
      setRows(lista.businesses);
      setTotal(lista.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(q, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // busca com debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      carregar(q, 0);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (detalheId == null) {
      setDetalhe(null);
      return;
    }
    setDetalheLoading(true);
    apiFetch(`/admin/businesses/${detalheId}`)
      .then(setDetalhe)
      .catch(() => setDetalhe(null))
      .finally(() => setDetalheLoading(false));
  }, [detalheId]);

  const sair = () => {
    clearOwnerSession();
    navigate("/");
  };

  const paginaAtual = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* barra superior */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/faicon.png" alt="YuU" className="w-7 h-7" />
          <span className="font-semibold text-gray-900">YuU</span>
          <span className="text-xs font-medium text-white bg-gray-900 rounded px-1.5 py-0.5">
            ADMIN
          </span>
        </div>
        <button
          onClick={sair}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <FiLogOut size={16} /> Sair
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Plataforma</h1>
            <p className="text-sm text-gray-400">Visão geral e negócios cadastrados</p>
          </div>
          <button
            onClick={() => carregar(q, offset)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>

        {erro && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi
            icon={<FiUsers />}
            label="Negócios"
            value={overview ? String(overview.negocios.total) : "—"}
            hint={
              overview
                ? `${overview.negocios.estabelecimentos} estab. · ${overview.negocios.profissionais} prof.`
                : ""
            }
          />
          <Kpi
            icon={<FiUsers />}
            label="Novos (30 dias)"
            value={overview ? String(overview.negocios.novos30d) : "—"}
            hint="cadastros recentes"
          />
          <Kpi
            icon={<FiCalendar />}
            label="Agendamentos"
            value={overview ? String(overview.agendamentos.total) : "—"}
            hint={
              overview
                ? `${overview.agendamentos.concluidos} concluídos · ${overview.agendamentos.cancelados} cancel.`
                : ""
            }
          />
          <Kpi
            icon={<FiDollarSign />}
            label="Receita registrada"
            value={overview ? brl(overview.receita.total) : "—"}
            hint={
              overview
                ? `${brl(overview.receita.atendimentos)} atend. · ${brl(overview.receita.caixa)} caixa`
                : ""
            }
          />
        </div>

        {/* busca */}
        <div className="relative mb-3 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, documento, email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-gray-400 bg-white"
          />
        </div>

        {/* tabela */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Negócio</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium text-right">Agend.</th>
                  <th className="px-4 py-3 font-medium text-right">Clientes</th>
                  <th className="px-4 py-3 font-medium">Últ. agend.</th>
                  <th className="px-4 py-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Carregando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Nenhum negócio encontrado.
                    </td>
                  </tr>
                ) : (
                  rows.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setDetalheId(b.id)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">
                          {formatDoc(b.document)}
                          {b.email ? ` · ${b.email}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{tipoLabel(b.accountType)}</div>
                        <div className="text-xs text-gray-400">{b.businessType}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.appointmentsCount}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.customersCount}</td>
                      <td className="px-4 py-3 text-gray-600">{dataCurta(b.lastAppointmentAt)}</td>
                      <td className="px-4 py-3 text-gray-600">{dataCurta(b.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              {total} {total === 1 ? "negócio" : "negócios"}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 enabled:hover:bg-gray-50 enabled:cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-xs">
                {paginaAtual} / {totalPaginas}
              </span>
              <button
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 enabled:hover:bg-gray-50 enabled:cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* modal de detalhe */}
      {detalheId != null && (
        <div
          className="fixed inset-0 bg-black/30 z-20 flex justify-end"
          onClick={() => setDetalheId(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">Detalhes do negócio</h2>
              <button
                onClick={() => setDetalheId(null)}
                className="text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {detalheLoading || !detalhe ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">
                {detalheLoading ? "Carregando..." : "Não foi possível carregar."}
              </div>
            ) : (
              <div className="px-5 py-4 space-y-5 text-sm">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{detalhe.name}</div>
                  <div className="text-gray-400 text-xs">
                    {formatDoc(detalhe.document)} · {tipoLabel(detalhe.accountType)} ·{" "}
                    {detalhe.businessType}
                  </div>
                </div>

                <Linha label="Email" valor={detalhe.email || "—"} />
                <Linha label="Telefone" valor={detalhe.phone || "—"} />
                <Linha
                  label="Atende a domicílio"
                  valor={detalhe.homeService ? "Sim" : "Não"}
                />
                <Linha
                  label="Link público"
                  valor={detalhe.publicSlug ? `/p/${detalhe.publicSlug}` : "—"}
                />
                <Linha label="Cadastro" valor={dataCurta(detalhe.createdAt)} />
                <Linha
                  label="Último login (2FA)"
                  valor={dataCurta(detalhe.lastVerifiedAt)}
                />
                {detalhe.address && (
                  <Linha
                    label="Endereço"
                    valor={`${detalhe.address.street}, ${detalhe.address.number} — ${detalhe.address.neighborhood}, ${detalhe.address.city}/${detalhe.address.state}`}
                  />
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <MiniStat label="Agendamentos" valor={detalhe.stats.agendamentos.total} />
                  <MiniStat label="Concluídos" valor={detalhe.stats.agendamentos.concluidos} />
                  <MiniStat label="Cancelados" valor={detalhe.stats.agendamentos.cancelados} />
                  <MiniStat label="Clientes" valor={detalhe.stats.clientes} />
                  <MiniStat
                    label="Serviços"
                    valor={`${detalhe.stats.servicos.ativos}/${detalhe.stats.servicos.total}`}
                  />
                  <MiniStat
                    label="Produtos"
                    valor={`${detalhe.stats.produtos.ativos}/${detalhe.stats.produtos.total}`}
                  />
                  <MiniStat label="Vendas caixa" valor={detalhe.stats.vendasCaixa} />
                  <MiniStat
                    label="Receita atend."
                    valor={brl(detalhe.stats.receitaAtendimentos)}
                  />
                </div>

                <div className="pt-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                    Últimos agendamentos
                  </div>
                  {detalhe.ultimosAgendamentos.length === 0 ? (
                    <div className="text-gray-400">Nenhum agendamento.</div>
                  ) : (
                    <ul className="space-y-2">
                      {detalhe.ultimosAgendamentos.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0"
                        >
                          <div>
                            <div className="text-gray-800">{a.customerName || "Cliente"}</div>
                            <div className="text-xs text-gray-400">
                              {a.serviceTitle || "Serviço"} ·{" "}
                              {new Date(a.scheduledAt).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-800">{brl(Number(a.price))}</div>
                            <div className="text-xs text-gray-400">{a.status}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- subcomponentes ----------
const Kpi = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs uppercase tracking-wide">
      {icon}
      {label}
    </div>
    <div className="text-xl font-semibold text-gray-900">{value}</div>
    {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
  </div>
);

const Linha = ({ label, valor }: { label: string; valor: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-800 text-right">{valor}</span>
  </div>
);

const MiniStat = ({ label, valor }: { label: string; valor: string | number }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="text-gray-900 font-medium">{valor}</div>
  </div>
);

export default Admin;
