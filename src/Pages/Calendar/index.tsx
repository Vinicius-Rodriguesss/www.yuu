import { useIsMobile } from "./useIsMobile";
import CalendarDesktop from "./CalendarDesktop";
import CalendarMobile from "./CalendarMobile";

// Rota /calendar: no desktop é a grade de dia custom (CalendarDesktop, inalterado);
// em telas pequenas (<=991px) usa a versão mobile própria, em lista de cards.
export default function Calendar() {
  const isMobile = useIsMobile();
  return isMobile ? <CalendarMobile /> : <CalendarDesktop />;
}
