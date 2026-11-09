/** Cálculos dos gráficos da economia (puro, testável). Dias e semanas no horário de Brasília. */
import { startOfDayBRT, toDateInputBRT } from "@/lib/dates";
import { isFarmExempt, weekRangeBRT } from "@/lib/finance";

const DAY_MS = 86400_000;

/** "2026-11-09" → "09/11" */
const shortLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

export type WeekRange = { from: Date; to: Date; label: string };

/** Primeiro instante da janela de `days` dias que termina hoje. */
export function windowStart(now: Date, days: number) {
  return new Date(startOfDayBRT(toDateInputBRT(now)).getTime() - (days - 1) * DAY_MS);
}

/** As últimas `count` semanas de farm (segunda a segunda), da mais antiga para a atual. */
export function lastWeeks(now: Date, count: number): WeekRange[] {
  const current = weekRangeBRT(now).from.getTime();
  return Array.from({ length: count }, (_, i) => {
    const from = new Date(current - (count - 1 - i) * 7 * DAY_MS);
    return { from, to: new Date(from.getTime() + 7 * DAY_MS), label: shortLabel(toDateInputBRT(from)) };
  });
}

/** Antes do primeiro dado não existe história: sem isso o gráfico mostraria zeros inventados. */
function dropLeading<T>(rows: T[], isEmpty: (row: T) => boolean) {
  const first = rows.findIndex((r) => !isEmpty(r));
  return first === -1 ? [] : rows.slice(first);
}

export type BalanceMove = { kind: "ENTRADA" | "SAIDA"; asset: "DINHEIRO_SUJO" | "DINHEIRO_LIMPO"; quantity: number; createdAt: Date };
export type BalancePoint = { label: string; dirty: number; clean: number };

/**
 * Saldo no fim de cada dia. `opening` é o saldo antes da janela e `moves`, só as confirmadas dentro dela.
 * Sem saldo anterior, começa na véspera do primeiro movimento. Sem nada, volta vazio.
 */
export function balanceSeries(opening: { dirty: number; clean: number }, moves: BalanceMove[], now: Date, days: number): BalancePoint[] {
  const start = windowStart(now, days).getTime();
  const deltas = new Map<string, { dirty: number; clean: number }>();
  for (const m of moves) {
    const key = toDateInputBRT(m.createdAt);
    const delta = deltas.get(key) ?? { dirty: 0, clean: 0 };
    delta[m.asset === "DINHEIRO_SUJO" ? "dirty" : "clean"] += m.kind === "ENTRADA" ? m.quantity : -m.quantity;
    deltas.set(key, delta);
  }

  const dayKeys = Array.from({ length: days }, (_, i) => toDateInputBRT(new Date(start + i * DAY_MS)));
  let { dirty, clean } = opening;
  const points = dayKeys.map((key) => {
    const delta = deltas.get(key);
    dirty += delta?.dirty ?? 0;
    clean += delta?.clean ?? 0;
    return { label: shortLabel(key), dirty, clean };
  });

  if (opening.dirty !== 0 || opening.clean !== 0) return points;
  const firstMove = dayKeys.findIndex((key) => deltas.has(key));
  return firstMove === -1 ? [] : points.slice(Math.max(0, firstMove - 1));
}

export type SaleRow = { quantity: number; unitPrice: number; buyerKind: "FACCAO" | "PLAYER"; createdAt: Date; itemName: string };
export type SalesWeek = { label: string; faccao: number; player: number };

/** Faturamento por semana, separando facção e player. */
export function salesByWeek(sales: SaleRow[], weeks: WeekRange[]): SalesWeek[] {
  const rows = weeks.map((w) => {
    const inWeek = sales.filter((s) => s.createdAt >= w.from && s.createdAt < w.to);
    const total = (kind: SaleRow["buyerKind"]) => inWeek.filter((s) => s.buyerKind === kind).reduce((n, s) => n + s.quantity * s.unitPrice, 0);
    return { label: w.label, faccao: total("FACCAO"), player: total("PLAYER") };
  });
  return dropLeading(rows, (r) => r.faccao === 0 && r.player === 0);
}

/** Itens que mais faturaram, do maior para o menor. */
export function topItems(sales: SaleRow[], limit: number) {
  const totals = new Map<string, number>();
  for (const s of sales) totals.set(s.itemName, (totals.get(s.itemName) ?? 0) + s.quantity * s.unitPrice);
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

type GoalCell = { applicable: false } | { applicable: true; pct: number };
type GoalRow = { member: { rpName: string }; hasGoals: boolean; exempt: boolean; cells: GoalCell[] };

/** % médio das metas de cada membro na semana. Em %, porque somar itens diferentes não faz sentido. */
export function memberGoalPct(rows: GoalRow[]) {
  return rows
    .filter((r) => r.hasGoals && !r.exempt)
    .map((r) => {
      const pcts = r.cells.flatMap((c) => (c.applicable ? [c.pct] : []));
      return { name: r.member.rpName, pct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
    })
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, "pt-BR"));
}

export type CompletionInput = {
  goals: { itemId: string; rankId: string | null; quantity: number; createdAt: Date }[];
  members: { id: string; rankId: string | null; joinedAt: Date }[];
  deliveries: { memberId: string; itemId: string; quantity: number; createdAt: Date }[];
  absences: { memberId: string; startsAt: Date; endsAt: Date }[];
};

/**
 * % de quem bateu a meta em cada semana, usando as metas atuais (o banco não guarda valores antigos).
 * Meta da patente vence a geral do mesmo item. Semanas em que ninguém tinha meta ficam de fora.
 */
export function weeklyCompletion({ goals, members, deliveries, absences }: CompletionInput, weeks: WeekRange[]) {
  return weeks.flatMap((week) => {
    const weekGoals = goals.filter((g) => g.createdAt < week.to);
    const itemIds = [...new Set(weekGoals.map((g) => g.itemId))];
    let total = 0;
    let complete = 0;

    for (const member of members) {
      if (member.joinedAt >= week.to) continue;
      if (isFarmExempt(absences.filter((a) => a.memberId === member.id), week.from, week.to)) continue;
      const applicable = itemIds.flatMap((itemId) => {
        const goal = weekGoals.find((g) => g.itemId === itemId && g.rankId === member.rankId) ?? weekGoals.find((g) => g.itemId === itemId && g.rankId === null);
        return goal ? [goal] : [];
      });
      if (!applicable.length) continue;
      total += 1;
      const delivered = (itemId: string) =>
        deliveries.filter((d) => d.memberId === member.id && d.itemId === itemId && d.createdAt >= week.from && d.createdAt < week.to).reduce((n, d) => n + d.quantity, 0);
      if (applicable.every((g) => delivered(g.itemId) >= g.quantity)) complete += 1;
    }

    return total === 0 ? [] : [{ label: week.label, pct: Math.round((complete / total) * 100), complete, total }];
  });
}
