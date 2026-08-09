/**
 * ClientHistoryModal — "Meus agendamentos": lista completa do histórico do
 * cliente com ESTE profissional (GET /public/:slug/history), com status de
 * cada um. Aberto a partir da barra do cliente na página pública.
 */
import { useState, useEffect } from "react";
import { FiX, FiCalendar, FiClock, FiDollarSign } from "react-icons/fi";
import { clientApiFetch } from "@/api/client";
import "./index.css";

interface HistoryAppointment {
  id: number;
  scheduledAt: string;
  duration: number;
  price: string;
  status: string;
  isHomeService: boolean;
  travelCost: string;
  serviceId: number;
  serviceTitle: string;
}

interface ClientHistoryModalProps {
  slug: string;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

const ClientHistoryModal = ({ slug, onClose }: ClientHistoryModalProps) => {
  const [appointments, setAppointments] = useState<HistoryAppointment[] | null>(null);

  useEffect(() => {
    clientApiFetch(`/public/${slug}/history`)
      .then((data) => setAppointments(data.appointments ?? []))
      .catch(() => setAppointments([]));
  }, [slug]);

  return (
    <div className="chm-overlay" onClick={onClose}>
      <div className="chm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="chm-header">
          <h3>Meus agendamentos</h3>
          <button className="chm-close" onClick={onClose} aria-label="Fechar">
            <FiX size={18} />
          </button>
        </header>

        <div className="chm-body">
          {appointments === null ? (
            <p className="chm-empty">Carregando...</p>
          ) : appointments.length === 0 ? (
            <p className="chm-empty">Você ainda não tem agendamentos com este profissional.</p>
          ) : (
            <div className="chm-list">
              {appointments.map((a) => (
                <div key={a.id} className="chm-item">
                  <div className="chm-item-date">
                    <FiCalendar size={12} />
                    <span>{formatDate(a.scheduledAt)}</span>
                    <FiClock size={12} />
                    <span>{formatTime(a.scheduledAt)}</span>
                  </div>
                  <div className="chm-item-row">
                    <strong>{a.serviceTitle}</strong>
                    <span className={`chm-badge chm-badge-${a.status}`}>
                      {statusLabels[a.status] ?? a.status}
                    </span>
                  </div>
                  <div className="chm-item-row">
                    <span className="chm-item-price">
                      <FiDollarSign size={11} />
                      {formatMoney(Number(a.price) + Number(a.travelCost))}
                    </span>
                    {a.isHomeService && <span className="chm-item-home">🏠 domicílio</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientHistoryModal;
