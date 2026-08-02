import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiCheck, FiDollarSign, FiX, FiPlus } from "react-icons/fi";
import "./index.css";

// Dias da semana exibidos no cabeçalho do mini-calendário
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Matriz de dias do mês (estático por enquanto, representando Julho/2026 como no design).
// TODO: substituir por geração dinâmica a partir da data atual quando a navegação de mês for implementada.
const monthDays = [
  [29, 30, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, 1, 2],
];

// Dia "de hoje" destacado em vermelho no mini-calendário
const today = 27;

const hours: number[] = [];
for (let i = 0; i < 24; i++) {
  hours.push(i);
}



const Calendar = () => {
  // Controla se o painel "Destacar Agendamentos" está expandido ou recolhido
  const [highlightOpen, setHighlightOpen] = useState(true);

  // Estado dos filtros de pagamento (Pago / Não pago)
  const [paidFilter, setPaidFilter] = useState(false);
  const [unpaidFilter, setUnpaidFilter] = useState(false);

  // Estado do filtro de status da reserva (Confirmada / Não confirmada)
  const [confirmedFilter, setConfirmedFilter] = useState(false);
  const [unconfirmedFilter, setUnconfirmedFilter] = useState(false);

  // Reseta todos os filtros do painel
  const handleClearFilters = () => {
    setPaidFilter(false);
    setUnpaidFilter(false);
    setConfirmedFilter(false);
    setUnconfirmedFilter(false);
  };

  // Referência de cada linha de hora, usada para calcular a posição real (em px) do horário atual
  const hourRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Referência da área com scroll do calendário, para centralizar o scroll no horário atual ao carregar
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToNowRef = useRef(false);

  // Posição (topo, em px) e texto (HH:mm) da linha que indica o horário atual
  const [nowTop, setNowTop] = useState<number | null>(null);
  const [nowLabel, setNowLabel] = useState("");

  useEffect(() => {
    // Calcula a posição da linha com base na altura real da linha da hora atual + fração dos minutos já passados
    const updateNowLine = () => {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const row = hourRowRefs.current[hour];

      if (row) {
        setNowTop(row.offsetTop + (minutes / 60) * row.offsetHeight);
      }
      setNowLabel(`${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Só rola até o horário atual uma vez, ao carregar a página (não deve "puxar" o scroll depois que o usuário navegar)
    if (nowTop === null || hasScrolledToNowRef.current || !calendarRef.current) return;

    const container = calendarRef.current;
    container.scrollTop = nowTop - container.clientHeight / 2;
    hasScrolledToNowRef.current = true;
  }, [nowTop]);

  // Controla a abertura do painel "Novo Agendamento" (e o overlay escurecido atrás dele)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  return (
    <div className="container-calendar">
      {/* Calendar header */}
      <div className="header-calendar">
        <div className="header-content">
          <button><FiChevronLeft /></button>
          <div className="header-content-text-container">
            <div className="header-content-text">
              <span>Seg,27 Jul</span>
              <span>14h - 20h</span>
            </div>
            <FiChevronDown />
          </div>
          <button><FiChevronRight /></button>
        </div>
      </div>
      <div className="main-calendar">
        {/* Main do calendar */}
        <div className="nav-calendar">
          {/* Mini-calendário de navegação por mês */}
          <div className="mini-calendar-header">
            <span>Julho 2026</span>
            <div className="mini-calendar-header-actions">
              <button><FiChevronLeft /></button>
              <button><FiChevronRight /></button>
            </div>
          </div>

          {/* Grade com os dias da semana e os dias do mês */}
          <div className="mini-calendar-grid">
            {weekDays.map((day) => (
              <span key={day} className="mini-calendar-weekday">{day}</span>
            ))}
            {monthDays.flat().map((day, index) => (
              <span
                key={index}
                className={`mini-calendar-day${day === today ? " mini-calendar-day-today" : ""}`}
              >
                {day}
              </span>
            ))}
          </div>

          <div className="nav-calendar-divider" />

          {/* Painel de filtros para destacar agendamentos na agenda */}
          <div className="highlight-appointments">
            <button
              className="highlight-appointments-toggle"
              onClick={() => setHighlightOpen((prev) => !prev)}
            >
              <span>Destacar Agendamentos</span>
              {highlightOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {highlightOpen && (
              <div className="highlight-appointments-content">
                {/* Filtro por status de pagamento */}
                <div className="filter-section">
                  <span className="filter-section-title">Pagamentos</span>

                  <label className={`filter-row${paidFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={paidFilter}
                      onChange={() => setPaidFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-paid"><FiDollarSign /></span>
                    <span className="filter-row-label">Pago</span>
                  </label>

                  <label className={`filter-row${unpaidFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={unpaidFilter}
                      onChange={() => setUnpaidFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-unpaid"><FiDollarSign /></span>
                    <span className="filter-row-label">Não pago</span>
                  </label>
                </div>

                {/* Filtro por status da reserva */}
                <div className="filter-section">
                  <span className="filter-section-title">Status da Reserva</span>

                  <label className={`filter-row${confirmedFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={confirmedFilter}
                      onChange={() => setConfirmedFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-confirmed"><FiCheck /></span>
                    <span className="filter-row-label">Confirmada</span>
                  </label>

                  <label className={`filter-row${unconfirmedFilter ? " filter-row-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={unconfirmedFilter}
                      onChange={() => setUnconfirmedFilter((prev) => !prev)}
                    />
                    <span className="filter-checkbox-box"><FiCheck /></span>
                    <span className="filter-tag filter-tag-unconfirmed"><FiX /></span>
                    <span className="filter-row-label">Não confirmada</span>
                  </label>
                </div>

                {/* Ações do painel de filtros */}
                <div className="highlight-appointments-actions">
                  <button className="btn-clear-filters" onClick={handleClearFilters}>Limpar</button>
                  <button className="btn-apply-filters">Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="calendar" ref={calendarRef}>
          {/* Linha indicando o horário atual, com o horário exibido acima dela */}
          {nowTop !== null && (
            <div className="current-time-indicator" style={{ top: nowTop }}>
              <span className="current-time-label">{nowLabel}</span>
              <div className="current-time-line" />
            </div>
          )}

          {hours.map((hour) => (
            <div
              key={hour}
              className="calendar-hour"
              ref={(el) => { hourRowRefs.current[hour] = el; }}
            >
              <div className="calendar-hour-label">{String(hour).padStart(2, "0")}:00</div>

              {/* Line  */}
              <div className="container-tasks">
                <div className="calendar-hour-line"></div>
                <button className="task-default" onClick={() => setIsNewAppointmentOpen(true)}>
                  Novo Agendamento
                  <FiPlus />
                </button>
                

              </div>
            </div>
          ))}


          {/* Novo agendamento: overlay escurece o fundo e o painel desliza a partir da direita */}
          <div
            className={`texture-appointment${isNewAppointmentOpen ? " open" : ""}`}
            onClick={() => setIsNewAppointmentOpen(false)}
          />
          <div className={`new-appointment${isNewAppointmentOpen ? " open" : ""}`}>
            <div className="new-appointment-header">
              <span>Novo Agendamento</span>
              <button
                className="new-appointment-close"
                onClick={() => setIsNewAppointmentOpen(false)}
              >
                <FiX />
              </button>
            </div>

            {/* Corpo do formulário, com scroll próprio caso o conteúdo cresça */}
            <div className="new-appointment-body">
              <div className="new-appointment-field">
                <label>Cliente</label>
                <input type="text" placeholder="Nome do cliente" />
              </div>

              <div className="new-appointment-field">
                <label>Serviço</label>
                <input type="text" placeholder="Ex: Corte de cabelo" />
              </div>

              <div className="new-appointment-row">
                <div className="new-appointment-field">
                  <label>Data</label>
                  <input type="date" />
                </div>
                <div className="new-appointment-field">
                  <label>Horário</label>
                  <input type="time" />
                </div>
              </div>

              <div className="new-appointment-row">
                <div className="new-appointment-field">
                  <label>Duração</label>
                  <select defaultValue="30">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                  </select>
                </div>
                <div className="new-appointment-field">
                  <label>Valor</label>
                  <input type="text" placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="new-appointment-field">
                <label>Status do pagamento</label>
                <select defaultValue="unpaid">
                  <option value="paid">Pago</option>
                  <option value="unpaid">Não pago</option>
                </select>
              </div>

              <div className="new-appointment-field">
                <label>Observações</label>
                <textarea placeholder="Alguma observação sobre o agendamento" rows={3} />
              </div>
            </div>

            {/* Ações fixas na base do painel */}
            <div className="new-appointment-footer">
              <button
                className="btn-clear-filters"
                onClick={() => setIsNewAppointmentOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn-apply-filters">Salvar</button>
            </div>
          </div>
        </div>
        {/* Main do calendar */}
      </div>
    </div>
  );
}
export default Calendar;
