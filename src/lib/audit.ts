import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(params: {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  data?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      summary: params.summary,
      data: params.data,
    },
  });
}
