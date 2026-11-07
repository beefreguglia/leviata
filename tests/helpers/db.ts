import { vi } from "vitest";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { resetDatabase, seed } from "../../prisma/seed-data";

export { db };

export async function resetAndSeed() {
  await resetDatabase(db);
  await seed(db);
}

/** Faz as próximas chamadas agirem como o usuário de teste com esse discordId (null = deslogado). */
export async function actAs(discordId: string | null) {
  const mocked = vi.mocked(auth) as unknown as { mockResolvedValue: (v: unknown) => void };
  if (!discordId) return mocked.mockResolvedValue(null);
  const user = await db.user.findUniqueOrThrow({ where: { discordId }, include: { member: true } });
  mocked.mockResolvedValue({ user: { id: user.id }, expires: new Date(Date.now() + 3600_000).toISOString() });
  return user;
}

export function form(data: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}

/** Troca as permissões de uma patente (simula a liderança configurando em Hierarquia). */
export async function setRankPerms(name: string, permissions: string[]) {
  await db.rank.update({ where: { name }, data: { permissions } });
}

/** Gerência "completa" (configuração customizada) — usada nos testes das regras de cada ação. */
export const GERENCIA_COMPLETA = [
  "painel.ver", "economia.ver", "membros.gerenciar", "regras.editar", "conteudo.editar", "operacoes.gerenciar",
  "financeiro.gerenciar", "punicoes.gerenciar", "ausencias.gerenciar", "auditoria.ver",
];

export const rankId = async (name: string) => (await db.rank.findUniqueOrThrow({ where: { name } })).id;
export const memberByName = (rpName: string) => db.member.findFirstOrThrow({ where: { rpName }, include: { rank: true } });

/** "YYYY-MM-DD" daqui a N dias (fuso de Brasília). */
export function day(offset: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 86400_000));
}

export const PNG_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

/** Cria um upload real (grava no storage de teste) e devolve o id. */
export async function makeUpload(memberRpName = "Dante Moretti") {
  const { saveImageUpload } = await import("@/lib/uploads");
  const member = await db.member.findFirst({ where: { rpName: memberRpName } });
  const up = await saveImageUpload(new File([PNG_BYTES], "print.png", { type: "image/png" }), member?.id ?? null);
  return up.id;
}
