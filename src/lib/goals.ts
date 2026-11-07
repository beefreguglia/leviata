import "server-only";
import { db } from "@/lib/db";
import { activeAbsenceWhere, COUNTING_STATUSES } from "@/lib/absences";
import { goalProgress, isFarmExempt, weekRangeBRT } from "@/lib/finance";

/**
 * Progresso das metas da semana para cada membro ativo.
 * Meta específica da patente vence a meta geral do mesmo item.
 * Quem tem ausência de 7+ dias que pega a semana fica dispensado (`exempt`): não conta como devendo.
 */
export async function weeklyGoals(now = new Date(), onlyMemberId?: string) {
  const { from, to } = weekRangeBRT(now);
  const [goals, members, delivered, weekAbsences] = await Promise.all([
    db.farmGoal.findMany({ where: { isActive: true }, include: { item: true, rank: true }, orderBy: { item: { name: "asc" } } }),
    db.member.findMany({
      where: { status: "ATIVO", ...(onlyMemberId ? { id: onlyMemberId } : {}) },
      include: { rank: true, user: true, absences: { where: activeAbsenceWhere(now), take: 1 } },
      orderBy: [{ rank: { order: "asc" } }, { rpName: "asc" }],
    }),
    db.vaultTransaction.groupBy({
      by: ["memberId", "itemId"],
      where: { status: "CONFIRMADA", kind: "ENTRADA", asset: "ITEM", memberId: { not: null }, createdAt: { gte: from, lt: to } },
      _sum: { quantity: true },
    }),
    db.absence.findMany({
      where: { status: { in: [...COUNTING_STATUSES] }, startsAt: { lt: to }, endsAt: { gte: from }, ...(onlyMemberId ? { memberId: onlyMemberId } : {}) },
      select: { memberId: true, startsAt: true, endsAt: true },
    }),
  ]);
  const done = new Map(delivered.map((d) => [`${d.memberId}:${d.itemId}`, d._sum.quantity ?? 0]));
  const itemIds = [...new Set(goals.map((g) => g.itemId))];
  const items = itemIds.map((id) => goals.find((g) => g.itemId === id)!.item);

  const rows = members.map((m) => {
    const cells = items.map((item) => {
      const goal = goals.find((g) => g.itemId === item.id && g.rankId === m.rankId) ?? goals.find((g) => g.itemId === item.id && g.rankId === null);
      if (!goal) return { itemId: item.id, applicable: false as const };
      return { itemId: item.id, applicable: true as const, goalId: goal.id, ...goalProgress(done.get(`${m.id}:${item.id}`) ?? 0, goal.quantity) };
    });
    const applicable = cells.filter((c) => c.applicable);
    return {
      member: m,
      absent: m.absences.length > 0,
      /** dispensado da meta desta semana (ausência longa) */
      exempt: isFarmExempt(weekAbsences.filter((a) => a.memberId === m.id), from, to),
      cells,
      complete: applicable.length > 0 && applicable.every((c) => c.applicable && c.complete),
      hasGoals: applicable.length > 0,
    };
  });
  return { from, to, goals, items, rows };
}
