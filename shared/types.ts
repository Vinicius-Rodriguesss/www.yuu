// Tipos compartilhados entre a web (src/) e o app (mobile/).
// Nada de React, DOM ou CSS aqui — só TypeScript puro.

// ===================== Sessões =====================

/** Sessão do DONO do negócio (usuário que gerencia a agenda). */
export interface OwnerSession {
  token: string;
}

/** Perfil do dono, retornado por GET /user/profile. */
export interface OwnerProfile {
  id: number;
  name: string;
  document: string;
  email: string;
  phone?: string | null;
  publicSlug?: string | null;
}

/** Sessão do CLIENTE FINAL (páginas públicas /p/:slug). */
export interface ClientSession {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email?: string | null;
}

// ===================== Endereços =====================

export interface ClientAddress {
  id: number;
  label: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
}

export type ClientAddressInput = Omit<ClientAddress, "id">;

// ===================== Catálogo =====================

export interface Service {
  id: number;
  title: string;
  description: string | null;
  duration: number; // minutos
  price: string; // numeric do Postgres vem como string
  category: string;
  active: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: string;
  active: boolean;
  trackStock: boolean;
  stockQuantity: number;
}

// Payloads de escrita (POST/PUT) da área do dono.

export interface ServiceInput {
  title: string;
  description?: string | null;
  duration: number;
  price: string | number;
  category: string;
  active?: boolean;
}

export interface ProductInput {
  name: string;
  price: string | number;
  active?: boolean;
  trackStock?: boolean;
  stockQuantity?: number;
}

export interface CaixaEntryInput {
  type: CaixaType;
  serviceId?: number | null;
  productId?: number | null;
  customerId?: number | null;
  description: string;
  amount: string | number;
  paymentMethod?: PaymentMethod;
  soldAt: string; // ISO
  notes?: string | null;
}

export interface AppointmentUpdateInput {
  customerId: number;
  serviceId: number;
  scheduledAt: string; // ISO
  tzOffsetMin: number;
  notes?: string | null;
  paymentStatus?: PaymentStatus;
  isHomeService?: boolean;
  customerAddressId?: number | null;
  products?: { productId: number; quantity: number }[];
}

// ===================== Clientes (do dono) =====================

export interface Customer {
  id: number;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
}

// ===================== Agendamentos =====================

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "paid" | "unpaid";

export interface Appointment {
  id: number;
  customerId: number;
  serviceId: number;
  customerName?: string;
  serviceTitle?: string;
  scheduledAt: string; // ISO — hora de parede
  duration: number;
  price: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  isHomeService: boolean;
  travelMinutes: number;
  meetingToken: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

// ===================== Disponibilidade =====================
// Formato real de computeDaySlots (backend/Services/Availability).

export type SlotStatus =
  | "available"
  | "occupied"
  | "blocked"
  | "past"
  | "unavailable";

export interface DaySlot {
  time: string; // "09:00"
  startAt: string; // ISO — hora de parede
  status: SlotStatus;
  appointmentId?: number;
  blockTitle?: string;
}

export interface DayAvailability {
  date: string; // "YYYY-MM-DD"
  isWorkDay: boolean;
  workStart: string | null;
  workEnd: string | null;
  interval: number;
  buffer: number;
  breakStart: string | null;
  breakEnd: string | null;
  slots: DaySlot[];
}

/** GET /public/:slug/availability = DayAvailability + campos de deslocamento. */
export interface PublicDayAvailability extends DayAvailability {
  travelMinutes: number;
  travelUnavailable: boolean;
  travelKm: number | null;
  travelCost: number;
  exceedsMaxDistance: boolean;
  maxDistanceKm: number | null;
}

// ===================== Perfil público =====================
// Formato real de GET /public/:slug (getPublicProfile).

export interface PublicAddress {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PublicServiceLite {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  price: string;
  category: string;
}

export interface PublicProductLite {
  id: number;
  name: string;
  price: string;
}

export interface PublicProfile {
  name: string;
  businessType: string;
  homeService: boolean;
  phone: string | null;
  address: PublicAddress | null;
  services: PublicServiceLite[];
  products: PublicProductLite[];
}

// ===================== Histórico do cliente =====================

export interface ClientHistoryAppointment {
  id: number;
  scheduledAt: string;
  duration: number;
  price: string;
  status: AppointmentStatus;
  isHomeService: boolean;
  travelCost: string;
  serviceId: number;
  serviceTitle: string;
  products: { name: string; unitPrice: string; quantity: number }[];
}

export interface ClientHistory {
  appointments: ClientHistoryAppointment[];
  recommendedServices: (PublicServiceLite & { timesBooked: number })[];
}

// ===================== Chat (assistente de IA) =====================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ===================== Caixa =====================

export type CaixaType = "service" | "product" | "other";
export type PaymentMethod = "dinheiro" | "cartao" | "pix" | "outro";

export interface CaixaEntry {
  id: number;
  type: CaixaType;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  soldAt: string;
  notes: string | null;
}

/** GET /caixa?date=YYYY-MM-DD */
export interface CaixaDay {
  date: string;
  entries: CaixaEntry[];
  total: number;
  totalByMethod: Record<string, number>;
}

// ===================== Dashboard =====================
// Formato real de GET /dashboard (getDashboard).

export interface DashboardAtendimento {
  id: number;
  cliente: string;
  servico: string;
  horario: string; // "14:30"
  valor: number;
  status: "realizado" | "cancelado" | "pendente";
  telefone?: string;
}

export interface DashboardSummary {
  atendimentosHoje: { total: number; realizados: number; pendentes: number };
  atendimentosMes: number;
  receitaMes: number;
  horariosLivres: unknown[];
  proximoAtendimento: DashboardAtendimento | null;
  ultimosAtendimentos: DashboardAtendimento[];
}
