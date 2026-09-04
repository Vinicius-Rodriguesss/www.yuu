// Formatação e validação reaproveitadas da web (src/Login, src/Components/CreatedCliente).
// TypeScript puro — sem dependências.
import { tzOffsetMin } from "./http";

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

/** Formata progressivamente CPF (11) ou CNPJ (14) enquanto se digita. */
export function formatDocument(value: string): string {
  const n = onlyDigits(value);
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return n
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidDocument(value: string): boolean {
  const len = onlyDigits(value).length;
  return len === 11 || len === 14;
}

export function isValidCpf(value: string): boolean {
  return onlyDigits(value).length === 11;
}

/** (11) 91234-5678 */
export function formatPhone(value: string): string {
  const n = onlyDigits(value).slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10)
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
}

/** 01234-567 */
export function formatCep(value: string): string {
  const n = onlyDigits(value).slice(0, 8);
  return n.length <= 5 ? n : `${n.slice(0, 5)}-${n.slice(5)}`;
}

/** "1234.50" (string do Postgres) → "R$ 1.234,50" */
export function formatBRL(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "50", "50,00", "R$ 50.90" → "50.00" / "50.90" (string pronta pro backend). "" → null */
export function parseMoneyInput(value: string): string | null {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/**
 * "Agora" como ISO cujos dígitos UTC são a hora de parede local — mesmo
 * modelo do resto do app (o que se vê é o que se grava). Use pra soldAt do
 * caixa e afins.
 */
export function wallNowIso(): string {
  return new Date(Date.now() + tzOffsetMin * 60000).toISOString();
}

const WD = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** ISO "hora de parede" → { time: "14:30", dayLabel: "Seg, 12 ago", weekday: "Segunda" } */
export function describeWallTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return {
    time: `${hh}:${mm}`,
    weekday: WD[d.getDay()],
    dayLabel: `${WD[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MO[d.getMonth()]}`,
    isoDate: iso.slice(0, 10),
  };
}

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
