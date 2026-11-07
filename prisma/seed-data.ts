import type { PrismaClient } from "../src/generated/prisma/client";
import { RANK_PALETTE } from "../src/lib/rank-colors";

export const ALL = ["admin"];
/** Gerente: cria e edita operações, economia, cidade e comunicação.
 *  Não vê ausências dos outros, não pune, não edita regras nem vê auditoria. */
export const GERENCIA = ["painel.ver", "economia.ver", "conteudo.editar", "operacoes.gerenciar", "financeiro.gerenciar"];
/** Soldado e Recruta: só veem cidade, comunicação, operações, membros e hierarquia. */
export const MEMBRO = ["painel.ver"];

/** Tudo para dev e testes: patentes, regras e usuários de teste. */
export async function seed(db: PrismaClient) {
  const rankByName = await seedRanks(db);
  await seedDevUsers(db, rankByName);
  await seedRules(db);
}

/** Patentes padrão (ajuste nomes e IDs de cargo do Discord pelo painel → Hierarquia). */
export async function seedRanks(db: PrismaClient) {
  const ranks = [
    { name: "Líder", order: 1, color: RANK_PALETTE[0], permissions: ALL },
    { name: "Sub-líder", order: 2, color: RANK_PALETTE[1], permissions: ALL },
    { name: "Gerente", order: 3, color: RANK_PALETTE[2], permissions: GERENCIA },
    { name: "Soldado", order: 4, color: RANK_PALETTE[3], permissions: MEMBRO },
    { name: "Recruta", order: 5, color: RANK_PALETTE[4], permissions: MEMBRO },
  ];
  const rankByName: Record<string, string> = {};
  for (const r of ranks) {
    const rank = await db.rank.upsert({ where: { name: r.name }, create: r, update: {} });
    rankByName[r.name] = rank.id;
  }
  return rankByName;
}

/** Usuários de teste (SÓ desenvolvimento/testes — nunca em produção). */
export async function seedDevUsers(db: PrismaClient, rankByName: Record<string, string>) {
  const people = [
    { discordId: "dev-lider", username: "lider.dev", rpName: "Dante Moretti", passport: "1001", phone: "(055) 100-101", rank: "Líder" },
    { discordId: "dev-gerente", username: "gerente.dev", rpName: "Rafa Cardoso", passport: "1024", phone: "(055) 102-424", rank: "Gerente" },
    { discordId: "dev-soldado", username: "soldado.dev", rpName: "Nina Torres", passport: "1187", phone: "(055) 118-787", rank: "Soldado" },
    { discordId: "dev-recruta", username: "recruta.dev", rpName: "Léo Vieira", passport: "1302", phone: "(055) 130-202", rank: "Recruta" },
  ];
  for (const p of people) {
    const user = await db.user.upsert({
      where: { discordId: p.discordId },
      create: { discordId: p.discordId, username: p.username },
      update: {},
    });
    await db.member.upsert({
      where: { userId: user.id },
      create: { rpName: p.rpName, passport: p.passport, phone: p.phone, userId: user.id, rankId: rankByName[p.rank] },
      update: {},
    });
  }

}

/** Regras da Leviatã (texto oficial da facção). */
export const ESTATUTO = `## Lealdade acima de tudo
A lealdade à Leviatã está acima de interesses, amizades externas ou benefícios individuais.

- Problemas internos devem ser resolvidos internamente.
- **Traição, vazamento de informações ou atitudes que prejudiquem deliberadamente a facção não serão toleradas.**
- Nenhum membro deve colocar interesses pessoais acima da organização.

## Ambição com propósito
Não se mover por ambições vazias.

- Cargos, reconhecimento e poder devem ser consequência de dedicação, competência, lealdade e contribuição para a Leviatã.
- Não será tolerado criar conflitos, passar por cima de companheiros ou buscar cargos apenas por status.
- Quem deseja crescer dentro da hierarquia deve demonstrar, por atitudes, que está preparado para assumir maiores responsabilidades.

## Relacionamentos entre membros
**É expressamente proibido namoro ou relacionamento amoroso entre membros da Leviatã.**

- A regra existe para evitar conflitos de interesse, favoritismo, ciúmes, conflitos internos e situações que possam atrapalhar o funcionamento da facção.
- O envolvimento afetivo entre membros não será considerado uma questão exclusivamente pessoal quando puder interferir na organização.
- O descumprimento da regra poderá resultar em exoneração.

## Hierarquia e respeito
- A hierarquia deve ser respeitada em todos os momentos.
- Ordens e decisões da liderança devem ser cumpridas durante ações.
- Discordâncias podem e devem ser apresentadas, mas com respeito.

## Compromisso com a Leviatã
- Participação, comprometimento e responsabilidade são exigidos de todos.
- Quando não puder logar ou participar das atividades, registre sua ausência no painel (**Ausências**).
- Não será aceito aparecer apenas quando houver benefícios, ações grandes ou oportunidades de destaque.

## Comunicação e organização
- Rádio organizado durante ações.
- Informações internas devem permanecer dentro da organização.
- Todos devem colaborar para manter a facção organizada e preparada.
`;

/** Regras iniciais (a liderança edita pelo painel). */
export async function seedRules(db: PrismaClient) {
  const rules = [
    {
      slug: "estatuto",
      title: "Regras da Leviatã",
      order: 1,
      isPublic: true,
      content: ESTATUTO,
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
