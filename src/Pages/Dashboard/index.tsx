import { useState, useEffect } from "react";
import { FiCalendar, FiClock, FiUser, FiDollarSign, FiCheckCircle, FiTrendingUp, FiChevronRight } from "react-icons/fi";

interface Atendimento {
  id: number;
  cliente: string;
  servico: string;
  horario: string;
  valor: number;
  status: "pendente" | "realizado" | "cancelado";
  telefone?: string;
}

interface DashboardData {
  nomeCliente: string;
  atendimentosHoje: {
    total: number;
    realizados: number;
    pendentes: number;
  };
  atendimentosMes: number;
  receitaMes: number;
  horariosLivres: string[];
  proximoAtendimento: Atendimento | null;
  ultimosAtendimentos: Atendimento[];
}

const Dashboard = () => {

  const [dados, setDados] = useState<DashboardData>({
    nomeCliente: "Vinicius",
    atendimentosHoje: {
      total: 0,
      realizados: 0,
      pendentes: 0
    },
    atendimentosMes: 0,
    receitaMes: 0,
    horariosLivres: [],
    proximoAtendimento: null,
    ultimosAtendimentos: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    // Simular delay de carregamento
    setTimeout(() => {
      // DADOS MOCKADOS
      const mockData: DashboardData = {
        nomeCliente: "João Silva Barbearia",
        atendimentosHoje: {
          total: 12,
          realizados: 7,
          pendentes: 5
        },
        atendimentosMes: 187,
        receitaMes: 12580.00,
        horariosLivres: [
          "09:00 - 10:00",
          "11:30 - 12:30",
          "14:00 - 15:00",
          "15:30 - 16:00",
          "16:30 - 17:30",
          "18:00 - 19:00"
        ],
        proximoAtendimento: {
          id: 1,
          cliente: "Maria Santos",
          servico: "Corte Feminino + Hidratação",
          horario: "10:00",
          valor: 180.00,
          status: "pendente",
          telefone: "(11) 98765-4321"
        },
        ultimosAtendimentos: [
          {
            id: 100,
            cliente: "Carlos Eduardo",
            servico: "Barba Completa",
            horario: "08:30",
            valor: 45.00,
            status: "realizado"
          },
          {
            id: 99,
            cliente: "Ana Beatriz",
            servico: "Corte Feminino",
            horario: "09:00",
            valor: 120.00,
            status: "realizado"
          },
          {
            id: 98,
            cliente: "Ricardo Oliveira",
            servico: "Corte Masculino",
            horario: "09:30",
            valor: 60.00,
            status: "realizado"
          }
        ]
      };

      setDados(mockData);
      setLoading(false);
    }, 1000);
  };

  const horarioAtual = new Date();
  const saudacao = horarioAtual.getHours() < 12 ? "Bom dia" : 
                   horarioAtual.getHours() < 18 ? "Boa tarde" : "Boa noite";

  const progressoHoje = dados.atendimentosHoje.total > 0 
    ? (dados.atendimentosHoje.realizados / dados.atendimentosHoje.total) * 100 
    : 0;

  // Formatar valor para Real
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="font-sans flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">
          {saudacao}, <span className="text-gray-900">{dados.nomeCliente.split(" ")[0]}</span>
        </h1>
        <p className="text-sm text-gray-400">
          {horarioAtual.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Grid de cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Atendimentos Hoje */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FiCalendar size={18} className="text-gray-900" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hoje</span>
          </div>
          
          <h3 className="text-3xl font-semibold text-gray-900 mb-1">
            {dados.atendimentosHoje.realizados}
            <span className="text-lg text-gray-300 mx-1">/</span>
            <span className="text-lg text-gray-400 font-normal">{dados.atendimentosHoje.total}</span>
          </h3>
          <p className="text-xs text-gray-500 mb-3">Atendimentos realizados</p>
          
          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressoHoje}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <p className="text-[11px] text-gray-400">
              {dados.atendimentosHoje.pendentes} pendentes
            </p>
            <span className="text-[11px] font-medium text-gray-600">
              {Math.round(progressoHoje)}%
            </span>
          </div>
        </div>

        {/* Atendimentos no Mês */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FiTrendingUp size={18} className="text-gray-900" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mensal</span>
          </div>
          
          <h3 className="text-3xl font-semibold text-gray-900 mb-1">{dados.atendimentosMes}</h3>
          <p className="text-xs text-gray-500 mb-4">Atendimentos este mês</p>
          
          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md w-fit">
            <FiTrendingUp size={12} />
            <span className="text-[11px] font-medium">+12% vs mês anterior</span>
          </div>
        </div>

        {/* Receita do Mês */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FiDollarSign size={18} className="text-gray-900" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Receita</span>
          </div>
          
          <h3 className="text-3xl font-semibold text-gray-900 mb-1">
            {formatarMoeda(dados.receitaMes)}
          </h3>
          <p className="text-xs text-gray-500 mb-4">Receita mensal</p>
          
          <div className="flex items-center gap-1.5">
            <FiDollarSign size={12} className="text-gray-400" />
            <span className="text-[11px] text-gray-400">
              Ticket médio: {formatarMoeda(
                dados.atendimentosMes > 0 ? dados.receitaMes / dados.atendimentosMes : 0
              )}
            </span>
          </div>
        </div>

        {/* Próximo Atendimento */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FiClock size={18} className="text-gray-900" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Próximo</span>
          </div>
          
          {dados.proximoAtendimento ? (
            <>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {dados.proximoAtendimento.horario}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <FiUser size={12} className="text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    {dados.proximoAtendimento.cliente}
                  </p>
                </div>
                <p className="text-xs text-gray-400 ml-5">
                  {dados.proximoAtendimento.servico}
                </p>
                <p className="text-xs font-medium text-gray-600 ml-5">
                  {formatarMoeda(dados.proximoAtendimento.valor)}
                </p>
              </div>
            </>
          ) : (
            <div className="py-2">
              <p className="text-sm text-gray-400">Sem atendimentos agendados</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid secundário: Horários Livres + Últimos Atendimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Seção de Horários Livres */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <FiClock size={18} className="text-gray-900" />
            <h2 className="text-base font-semibold text-gray-900">Horários Disponíveis Hoje</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">
              {dados.horariosLivres.length}
            </span>
          </div>
          
          {dados.horariosLivres.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {dados.horariosLivres.map((horario, index) => (
                  <button
                    key={index}
                    className="border border-gray-200 rounded-md p-3 text-left hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiClock size={14} className="text-gray-400 group-hover:text-white" />
                        <span className="text-sm font-medium">{horario}</span>
                      </div>
                      <FiChevronRight size={14} className="text-gray-300 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <FiCheckCircle size={12} className="text-gray-600" />
                  Clique em um horário para agendar um novo atendimento
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FiClock size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">Sem horários disponíveis hoje</p>
            </div>
          )}
        </div>

        {/* Últimos Atendimentos Realizados */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <FiCheckCircle size={18} className="text-gray-900" />
            <h2 className="text-base font-semibold text-gray-900">Últimos Atendimentos</h2>
            <span className="text-xs text-gray-400 ml-auto">
              Hoje
            </span>
          </div>
          
          {dados.ultimosAtendimentos.length > 0 ? (
            <div className="space-y-3">
              {dados.ultimosAtendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <FiUser size={14} className="text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {atendimento.cliente}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {atendimento.servico}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-0.5">
                      <FiClock size={10} />
                      <span className="text-[11px]">{atendimento.horario}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-700">
                      {formatarMoeda(atendimento.valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FiCheckCircle size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">Nenhum atendimento realizado hoje</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[11px] text-gray-300">
          Atualizado em tempo real • {horarioAtual.toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;