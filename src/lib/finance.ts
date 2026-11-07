/** Regras do baú, metas e encomendas (puro, testável). */
import { BRT_OFFSET_HOURS } from "@/lib/dates";

export const money = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;

type Move = { kind: "ENTRADA" | "SAIDA"; asset: "DINHEIRO_SUJO" | "DINHEIRO_LIMPO" | "ITEM"; itemId: string | null; quantity: number; status: string };

/** Saldo por dinheiro e por item (só movimentações confirmadas). */
export function vaultBalance(moves: Move[]) {
  const totals = { DINHEIRO_SUJO: 0, DINHEIRO_LIMPO: 0 };
  const items = new Map<string, number>();
  for (const m of moves) {
    if (m.status !== "CONFIRMADA") continue;
    const sign = m.kind === "ENTRADA" ? 1 : -1;
    if (m.asset === "ITEM") {
      if (!m.itemId) continue;
      items.set(m.itemId, (items.get(m.itemId) ?? 0) + sign * m.quantity);
    } else {
      totals[m.asset] += sign * m.quantity;
    }
  }
  return { dirty: totals.DINHEIRO_SUJO, clean: totals.DINHEIRO_LIMPO, items };
}

/** Semana de farm: segunda 00:00 → próxima segunda 00:00 (horário de Brasília). */
export function weekRangeBRT(now = new Date()) {
  const brt = new Date(now.getTime() - BRT_OFFSET_HOURS * 3600_000); // "relógio" de Brasília em UTC
  const dow = (brt.getUTCDay() + 6) % 7; // segunda = 0
  const startBrt = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - dow);
  const from = new Date(startBrt + BRT_OFFSET_HOURS * 3600_000);
  const to = new Date(from.getTime() + 7 * 86400_000);
  return { from, to };
}

/** Ausência deste tamanho (ou maior) que pega a semana dispensa a pessoa da meta de farm. */
export const LONG_ABSENCE_DAYS = 7;

/** Dias de uma ausência contando o primeiro e o último (ela vai do início do 1º dia ao fim do último). */
export const absenceDays = (a: { startsAt: Date; endsAt: Date }) => Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 86400_000);

/** Dispensado da meta da semana [from, to): tem ausência de 7+ dias que encosta na semana. */
export function isFarmExempt(absences: { startsAt: Date; endsAt: Date }[], from: Date, to: Date) {
  return absences.some((a) => a.startsAt < to && a.endsAt >= from && absenceDays(a) >= LONG_ABSENCE_DAYS);
}

/** Progresso de uma meta: 0 a 100 (pode passar de 100 no "feito"). */
export function goalProgress(done: number, target: number) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 100;
  return { done, target, pct, missing: Math.max(0, target - done), complete: done >= target };
}

/** Transições permitidas de status de encomenda. */
export const ORDER_FLOW: Record<string, string[]> = {
  ABERTA: ["PRODUCAO", "CANCELADA"],
  PRODUCAO: ["PRONTA", "ABERTA", "CANCELADA"],
  PRONTA: ["ENTREGUE", "PRODUCAO", "CANCELADA"],
  ENTREGUE: [],
  CANCELADA: ["ABERTA"],
};

export function canMoveOrder(from: string, to: string) {
  return ORDER_FLOW[from]?.includes(to) ?? false;
}

export const orderTotal = (o: { quantity: number; unitPrice: number }) => o.quantity * o.unitPrice;
