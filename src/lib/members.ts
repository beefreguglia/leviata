import type { MemberStatus } from "@/generated/prisma/client";

/** Status de quem não está mais na fac (sem acesso ao painel e fora das listas). */
export const GONE_STATUSES = ["EXPULSO", "SAIU"] as const satisfies readonly MemberStatus[];
export type GoneStatus = (typeof GONE_STATUSES)[number];

/** Filtro Prisma: só quem ainda está na fac. */
export const inFactionWhere = { status: { notIn: [...GONE_STATUSES] } };

export function isGone(status: MemberStatus | null | undefined): status is GoneStatus {
  return status === "EXPULSO" || status === "SAIU";
}

/** Status que a ficha edita direto; sair/expulsar passa pelo botão Desligar. */
export const EDITABLE_STATUSES = ["ATIVO", "INATIVO", "AFASTADO"] as const satisfies readonly MemberStatus[];
