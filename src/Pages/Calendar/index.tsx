import { useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiCheck, FiDollarSign, FiX } from "react-icons/fi";
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
for (let i = 1; i <= 24; i++) {
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
        <div className="calendar">

            {hours.map((hour) => (
              <div key={hour} className="calendar-hour">
                <div className="calendar-hour-label">{hour}:00</div>

                {/* Line  */}
                <div className="calendar-hour-line"></div>
              </div>
            ))}

        </div>
        {/* Main do calendar */}
      </div>
    </div>
  );
}
export default Calendar;
