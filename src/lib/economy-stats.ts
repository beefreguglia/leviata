import "server-only";
import { db } from "@/lib/db";
import { COUNTING_STATUSES } from "@/lib/absences";
import { balanceSeries, lastWeeks, salesByWeek, topItems, weeklyCompletion, windowStart, type BalanceMove } from "@/lib/economy-charts";

const MONEY_ASSETS = ["DINHEIRO_SUJO", "DINHEIRO_LIMPO"] as const;
const HISTORY_WEEKS = 8;

/** Saldo sujo e limpo no fim de cada dia dos últimos 30 dias. */
export async function vaultHistory(now = new Date()) {
  const days = 30;
  const from = windowStart(now, days);
  const [before, moves] = await Promise.all([
    db.vaultTransaction.groupBy({
      by: ["asset", "kind"],
      where: { status: "CONFIRMADA", asset: { in: [...MONEY_ASSETS] }, createdAt: { lt: from } },
      _sum: { quantity: true },
    }),
    db.vaultTransaction.findMany({
      where: { status: "CONFIRMADA", asset: { in: [...MONEY_ASSETS] }, createdAt: { gte: from } },
      select: { kind: true, asset: true, quantity: true, createdAt: true },
    }),
  ]);
  const opening = { dirty: 0, clean: 0 };
  for (const row of before) {
    opening[row.asset === "DINHEIRO_SUJO" ? "dirty" : "clean"] += (row._sum.quantity ?? 0) * (row.kind === "ENTRADA" ? 1 : -1);
  }
  return balanceSeries(opening, moves as BalanceMove[], now, days);
}

/** % de quem bateu a meta nas últimas 8 semanas. */
export async function goalHistory(now = new Date()) {
  const weeks = lastWeeks(now, HISTORY_WEEKS);
  const from = weeks[0].from;
  const to = weeks.at(-1)!.to;
  const [goals, members, deliveries, absences] = await Promise.all([
    db.farmGoal.findMany({ where: { isActive: true }, select: { itemId: true, rankId: true, quantity: true, createdAt: true } }),
    db.member.findMany({ where: { status: "ATIVO" }, select: { id: true, rankId: true, joinedAt: true } }),
    db.vaultTransaction.findMany({
      where: { status: "CONFIRMADA", kind: "ENTRADA", asset: "ITEM", memberId: { not: null }, itemId: { not: null }, createdAt: { gte: from, lt: to } },
      select: { memberId: true, itemId: true, quantity: true, createdAt: true },
    }),
    db.absence.findMany({ where: { status: { in: [...COUNTING_STATUSES] }, startsAt: { lt: to }, endsAt: { gte: from } }, select: { memberId: true, startsAt: true, endsAt: true } }),
  ]);
  return weeklyCompletion({ goals, members, deliveries: deliveries.map((d) => ({ ...d, memberId: d.memberId!, itemId: d.itemId! })), absences }, weeks);
}

/** Faturamento por semana e itens que mais faturaram nas últimas 8 semanas (sem as canceladas). */
export async function salesHistory(now = new Date()) {
  const weeks = lastWeeks(now, HISTORY_WEEKS);
  const rows = await db.sale.findMany({
    where: { cancelledAt: null, createdAt: { gte: weeks[0].from, lt: weeks.at(-1)!.to } },
    select: { quantity: true, unitPrice: true, buyerKind: true, createdAt: true, item: { select: { name: true } } },
  });
  const sales = rows.map(({ item, ...s }) => ({ ...s, itemName: item.name }));
  return { byWeek: salesByWeek(sales, weeks), items: topItems(sales, 5) };
}
