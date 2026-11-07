import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Horário de Brasília (sem horário de verão desde 2019). */
const BRT_OFFSET = "-03:00";
export const BRT_OFFSET_HOURS = 3;

/** "2026-11-06" → início do dia em Brasília */
export function startOfDayBRT(dateStr: string) {
  return new Date(`${dateStr}T00:00:00${BRT_OFFSET}`);
}

/** "2026-11-06" → fim do dia em Brasília */
export function endOfDayBRT(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999${BRT_OFFSET}`);
}

/** Date → "2026-11-06" no fuso de Brasília (para <input type="date">) */
export function toDateInputBRT(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function inBRT(date: Date) {
  // desloca para que format() (que usa o fuso do servidor) mostre o horário de Brasília
  const brt = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return brt;
}

export function fmtDate(date: Date | null | undefined) {
  return date ? format(inBRT(date), "dd/MM/yyyy", { locale: ptBR }) : "—";
}

export function fmtDateTime(date: Date | null | undefined) {
  return date ? format(inBRT(date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";
}

export function fmtShort(date: Date) {
  return format(inBRT(date), "dd MMM", { locale: ptBR });
}

export function fmtAgo(date: Date | null | undefined) {
  return date ? formatDistanceToNow(date, { locale: ptBR, addSuffix: true }) : "nunca";
}

/** "2026-11-07T20:30" (input datetime-local, horário de Brasília) → Date */
export function fromDateTimeInputBRT(v: string) {
  return new Date(`${v}:00${BRT_OFFSET}`);
}

/** Date → "2026-11-07T20:30" no horário de Brasília (para <input type="datetime-local">) */
export function toDateTimeInputBRT(date: Date | null | undefined) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "20:30" no horário de Brasília */
export function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
}

/** "sáb., 7 de nov." */
export function fmtWeekday(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(date);
}
