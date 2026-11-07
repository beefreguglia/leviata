import type { PrismaClient } from "../src/generated/prisma/client";
import { RANK_PALETTE } from "../src/lib/rank-colors";

export const ALL = ["admin"];
export const GERENCIA = [
  "painel.ver",
  "membros.gerenciar",
  "regras.editar",
  "conteudo.editar",
  "operacoes.gerenciar",
  "financeiro.gerenciar",
  "punicoes.gerenciar",
  "ausencias.gerenciar",
  "auditoria.ver",
];
export const MEMBRO = ["painel.ver"];

export async function seed(db: PrismaClient) {
  // Patentes (ajuste nomes e IDs de cargo do Discord pelo painel → Hierarquia)
  const ranks = [
    { name: "Líder", order: 1, color: RANK_PALETTE[0], permissions: ALL },
    { name: "Sub-líder", order: 2, color: RANK_PALETTE[1], permissions: ALL },
    { name: "Gerente", order: 3, color: RANK_PALETTE[2], permissions: GERENCIA },
    { name: "Soldado", order: 4, color: RANK_PALETTE[3], permissions: MEMBRO },
    { name: "Recruta", order: 5, color: RANK_PALETTE[4], permissions: [] as string[] },
  ];
  const rankByName: Record<string, string> = {};
  for (const r of ranks) {
    const rank = await db.rank.upsert({ where: { name: r.name }, create: r, update: {} });
    rankByName[r.name] = rank.id;
  }

  // Usuários de teste (só para login de desenvolvimento)
  const people = [
    { discordId: "dev-lider", username: "lider.dev", rpName: "Dante Moretti", passport: "1001", rank: "Líder" },
    { discordId: "dev-gerente", username: "gerente.dev", rpName: "Rafa Cardoso", passport: "1024", rank: "Gerente" },
    { discordId: "dev-soldado", username: "soldado.dev", rpName: "Nina Torres", passport: "1187", rank: "Soldado" },
    { discordId: "dev-recruta", username: "recruta.dev", rpName: "Léo Vieira", passport: "1302", rank: "Recruta" },
  ];
  for (const p of people) {
    const user = await db.user.upsert({
      where: { discordId: p.discordId },
      create: { discordId: p.discordId, username: p.username },
      update: {},
    });
    await db.member.upsert({
      where: { userId: user.id },
      create: { rpName: p.rpName, passport: p.passport, userId: user.id, rankId: rankByName[p.rank] },
      update: {},
    });
  }

  // Regras iniciais
  const rules = [
    {
      slug: "estatuto",
      title: "Estatuto da Leviata",
      order: 1,
      isPublic: true,
      content: `## 1. Lealdade
- A família vem em primeiro lugar. Nada do que é falado aqui sai daqui.
- Proibido negociar com facções inimigas sem autorização da liderança.

## 2. Hierarquia
- Ordens da liderança são cumpridas. Discordou? Fala em particular depois.
- Promoções são decididas pela liderança com base em presença, farm e postura.

## 3. Ações
- Só participa quem estiver escalado.
- Rádio sempre na frequência combinada.
`,
    },
    {
      slug: "conduta",
      title: "Conduta e punições",
      order: 2,
      isPublic: false,
      content: `## Advertências
| Infração | Punição |
| --- | --- |
| Faltar ação escalada sem aviso | Advertência |
| Não bater meta de farm | Advertência |
| 3 advertências | Rebaixamento ou expulsão |

> Avise sua ausência pelo painel → **Ausências**.
`,
    },
  ];
  for (const r of rules) {
    await db.rulePage.upsert({
      where: { slug: r.slug },
      create: { ...r, versions: { create: { title: r.title, content: r.content } } },
      update: {},
    });
  }

}


/** Apaga tudo (usado só pelos testes). */
export async function resetDatabase(db: PrismaClient) {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (!tables.length) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
