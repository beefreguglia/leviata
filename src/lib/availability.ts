import "server-only";
import { db } from "@/lib/db";
import { COUNTING_STATUSES } from "@/lib/absences";

/** Membros que NÃO podem ser escalados num horário → motivo. */
export async function unavailableMembers(at: Date) {
  const [absent, notActive] = await Promise.all([
    db.absence.findMany({
      where: { status: { in: [...COUNTING_STATUSES] }, startsAt: { lte: at }, endsAt: { gte: at } },
      select: { memberId: true },
    }),
    db.member.findMany({ where: { status: { not: "ATIVO" } }, select: { id: true, status: true } }),
  ]);
  const map = new Map<string, string>();
  for (const m of notActive) map.set(m.id, m.status === "AFASTADO" ? "afastado" : m.status === "EXPULSO" ? "expulso" : "inativo");
  for (const a of absent) map.set(a.memberId, "ausente");
  return map;
}
