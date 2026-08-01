import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import "./index.css";
const Calendar = () => {
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

        </div>
        <div className="calendar">
          
        </div>
        {/* Main do calendar */}
      </div>
    </div>
  );
}
export default Calendar;