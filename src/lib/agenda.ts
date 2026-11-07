/** Calendário (puro, testável). Tudo em horário de Brasília. */
import { toDateInputBRT } from "@/lib/dates";

export type CalendarDay = { key: string; day: number; inMonth: boolean; isToday: boolean };

/** "2026-11" válido → [ano, mês 1-12]; senão o mês atual (Brasília). */
export function parseMonth(raw: string | null | undefined, now = new Date()): [number, number] {
  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12) return [y, mo];
  }
  const [y, mo] = toDateInputBRT(now).split("-").map(Number);
  return [y, mo];
}

export const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

export function shiftMonth(y: number, m: number, delta: number): [number, number] {
  const idx = y * 12 + (m - 1) + delta;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}

/** Semanas (domingo → sábado) que cobrem o mês, com os dias de fora marcados. */
export function monthGrid(y: number, m: number, now = new Date()): CalendarDay[][] {
  const today = toDateInputBRT(now);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const weeks: CalendarDay[][] = [];
  const cur = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const key = cur.toISOString().slice(0, 10);
      week.push({ key, day: cur.getUTCDate(), inMonth: cur.getUTCMonth() === m - 1, isToday: key === today });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cur.getUTCMonth() === m - 1);
  return weeks;
}

/** Intervalo [início, fim) do mês em Brasília, para buscar no banco (com folga da grade). */
export function monthRange(y: number, m: number) {
  const grid = monthGrid(y, m);
  const firstKey = grid[0][0].key;
  const lastKey = grid.at(-1)!.at(-1)!.key;
  return { from: new Date(`${firstKey}T00:00:00-03:00`), to: new Date(`${lastKey}T23:59:59.999-03:00`) };
}

/** Agrupa eventos pelo dia (Brasília) em que começam. */
export function groupByDay<T extends { startsAt: Date }>(events: T[]) {
  const map = new Map<string, T[]>();
  for (const e of events) {
    const key = toDateInputBRT(e.startsAt);
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  for (const list of map.values()) list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return map;
}

export const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
