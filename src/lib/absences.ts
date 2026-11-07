import type { Prisma } from "@/generated/prisma/client";

/** Ausências que contam como "ausente": pendentes ou aprovadas (recusadas/canceladas não). */
export const COUNTING_STATUSES = ["PENDENTE", "APROVADA"] as const;

/** where para ausências ativas agora */
export function activeAbsenceWhere(now = new Date()): Prisma.AbsenceWhereInput {
  return { status: { in: [...COUNTING_STATUSES] }, startsAt: { lte: now }, endsAt: { gte: now } };
}
