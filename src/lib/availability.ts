import "server-only";
import { db } from "@/lib/db";
import { COUNTING_STATUSES } from "@/lib/absences";
import { activePunishmentWhere } from "@/lib/punishments";

/** Membros que NÃO podem ser escalados num horário → motivo. */
export async function unavailableMembers(at: Date) {
  const [absent, notActive, suspended] = await Promise.all([
    db.absence.findMany({
      where: { status: { in: [...COUNTING_STATUSES] }, startsAt: { lte: at }, endsAt: { gte: at } },
      select: { memberId: true },
    }),
    db.member.findMany({ where: { status: { not: "ATIVO" } }, select: { id: true, status: true } }),
    db.punishment.findMany({ where: { kind: "SUSPENSAO", ...activePunishmentWhere(at) }, select: { memberId: true } }),
  ]);
  const map = new Map<string, string>();
  for (const m of notActive) map.set(m.id, m.status === "AFASTADO" ? "afastado" : m.status === "EXPULSO" ? "expulso" : "inativo");
  for (const a of absent) map.set(a.memberId, "ausente");
  for (const p of suspended) map.set(p.memberId, "suspenso");
  return map;
}
