import type { Prisma } from "@/generated/prisma/client";

/** include padrão de aviso com enquete (contagem por opção + o voto de quem está vendo). */
export function noticeInclude(memberId: string | null | undefined) {
  return {
    author: true,
    pollOptions: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
    pollVotes: { where: { memberId: memberId ?? "-" }, select: { optionId: true } },
    _count: { select: { pollVotes: true } },
  } satisfies Prisma.NoticeInclude;
}

export type NoticeWithPoll = Prisma.NoticeGetPayload<{ include: ReturnType<typeof noticeInclude> }>;

/** Percentual inteiro (0 quando ninguém votou). */
export const pct = (votes: number, total: number) => (total ? Math.round((votes / total) * 100) : 0);
