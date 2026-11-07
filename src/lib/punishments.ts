import type { Prisma } from "@/generated/prisma/client";

/** Punições que ainda valem agora (ativas e não vencidas). */
export function activePunishmentWhere(now = new Date()): Prisma.PunishmentWhereInput {
  return { status: "ATIVA", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

/** Advertência vale 30 dias se não informar outro prazo. */
export const WARNING_DAYS = 30;
