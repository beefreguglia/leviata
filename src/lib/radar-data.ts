import "server-only";
import { db } from "@/lib/db";
import { activeAbsenceWhere } from "@/lib/absences";
import { inactiveMembers, type RadarActivity } from "@/lib/radar";

/** Monta o radar: entrega de farm conta mesmo antes de a gerência conferir; estornada não. */
export async function loadRadar(now = new Date()) {
  const [members, farm, attendance, absences] = await Promise.all([
    db.member.findMany({ where: { status: "ATIVO" }, include: { rank: true, user: true } }),
    db.vaultTransaction.groupBy({
      by: ["memberId"],
      where: { kind: "ENTRADA", asset: "ITEM", status: { in: ["CONFIRMADA", "PENDENTE"] }, memberId: { not: null } },
      _max: { createdAt: true },
    }),
    db.attendance.groupBy({ by: ["memberId"], _max: { updatedAt: true } }),
    db.absence.findMany({ where: activeAbsenceWhere(now), select: { memberId: true } }),
  ]);
  const activity = new Map<string, RadarActivity>();
  for (const row of farm) activity.set(row.memberId!, { lastFarm: row._max.createdAt });
  for (const row of attendance) activity.set(row.memberId, { ...activity.get(row.memberId), lastAttendance: row._max.updatedAt });
  return inactiveMembers(members, activity, new Set(absences.map((a) => a.memberId)), now);
}
