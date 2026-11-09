/**
 * Estrutura oficial da Leviatã (cargos do servidor do Discord, nov/2026).
 * Usada pelo seed e pelo ajuste de produção. As permissões ficam editáveis depois em Hierarquia.
 */
import { RANK_PALETTE } from "../src/lib/rank-colors";

/** Recruta, Membro e Veterano: veem tudo (inclusive a economia), mas não editam. */
const VER = ["painel.ver", "economia.ver"];

/** Patentes (escada): uma por pessoa. */
export const LEVIATA_RANKS = [
  { name: "Hierarquia", order: 1, color: RANK_PALETTE[0], discordRoleId: "1534404775188238467", permissions: ["admin"] },
  { name: "Veterano", order: 2, color: RANK_PALETTE[2], discordRoleId: "1552728992887341066", permissions: VER },
  { name: "Membro", order: 3, color: RANK_PALETTE[3], discordRoleId: "1534404775171330102", permissions: VER },
  { name: "Recruta", order: 4, color: RANK_PALETTE[4], discordRoleId: "1534404775171330101", permissions: VER },
];

/** Setores: um por pessoa. (Comércio só tem o gerente: o cargo do setor é o próprio G-Comércio.) */
export const LEVIATA_SECTORS = [
  { name: "Vanguarda", description: "Ações", order: 1, color: "#f75a68", discordRoleId: "1568727339481956553" },
  { name: "Propulsão", description: "Corrida", order: 2, color: "#fba94c", discordRoleId: "1568727551264821409" },
  { name: "Vigília", description: "Investigativa", order: 3, color: "#8b7cf6", discordRoleId: "1568727668290093197", permissions: ["dossie.gerenciar"] },
  { name: "Comércio", description: "Vendas e encomendas", order: 4, color: "#04d361", discordRoleId: "1534404775171330106" },
];

/** Gerências: somam permissões à patente; uma pessoa pode ter várias. */
export const LEVIATA_MANAGEMENTS = [
  {
    name: "G-Geral",
    order: 1,
    sector: null,
    discordRoleId: "1534404775188238466",
    permissions: ["painel.ver", "economia.ver", "conteudo.editar", "operacoes.gerenciar", "financeiro.gerenciar", "radar.ver"],
  },
  { name: "G-Ação", order: 2, sector: "Vanguarda", discordRoleId: "1534404775171330107", permissions: ["painel.ver", "operacoes.gerenciar", "radar.ver"] },
  { name: "G-Corrida", order: 3, sector: "Propulsão", discordRoleId: "1568731925768835082", permissions: ["painel.ver", "operacoes.gerenciar", "radar.ver"] },
  { name: "G-Investigativa", order: 4, sector: "Vigília", discordRoleId: "1534404775171330104", permissions: ["painel.ver", "conteudo.editar", "radar.ver", "dossie.gerenciar"] },
  {
    name: "G-Comércio",
    order: 5,
    sector: "Comércio",
    discordRoleId: "1534404775171330106",
    permissions: ["painel.ver", "economia.ver", "financeiro.gerenciar", "radar.ver"],
  },
];

import type { PrismaClient } from "../src/generated/prisma/client";

/** Patentes antigas → nova patente de quem estava nelas (o Discord corrige no próximo login). */
const OLD_RANKS: Record<string, string> = { "Líder": "Hierarquia", "Sub-líder": "Hierarquia", Gerente: "Membro", Soldado: "Membro" };

/**
 * Aplica a estrutura oficial (idempotente): patentes, setores e gerências com os cargos do Discord.
 * Patentes antigas (Líder, Sub-líder, Gerente, Soldado) somem; quem estava nelas vai para a nova equivalente.
 */
export async function applyLeviataStructure(db: PrismaClient, log: (msg: string) => void = () => {}) {
  await db.$transaction(async (tx) => {
    // ordem é única: tira todo mundo do caminho antes de reordenar
    const all = await tx.rank.findMany();
    for (const r of all) await tx.rank.update({ where: { id: r.id }, data: { order: r.order + 1000 } });
    // cargo do Discord também é único: limpa os que vão ser reatribuídos
    const roleIds = LEVIATA_RANKS.map((r) => r.discordRoleId);
    await tx.rank.updateMany({ where: { discordRoleId: { in: roleIds } }, data: { discordRoleId: null } });

    const byName: Record<string, string> = {};
    for (const r of LEVIATA_RANKS) {
      const row = await tx.rank.upsert({ where: { name: r.name }, create: r, update: r });
      byName[r.name] = row.id;
    }
    for (const [old, to] of Object.entries(OLD_RANKS)) {
      const rank = await tx.rank.findUnique({ where: { name: old } });
      if (!rank) continue;
      const moved = await tx.member.updateMany({ where: { rankId: rank.id }, data: { rankId: byName[to] } });
      // metas: única por item+patente — se a nova já tem meta do item, a antiga sai
      for (const goal of await tx.farmGoal.findMany({ where: { rankId: rank.id } })) {
        const clash = await tx.farmGoal.findFirst({ where: { itemId: goal.itemId, rankId: byName[to] } });
        if (clash) await tx.farmGoal.delete({ where: { id: goal.id } });
        else await tx.farmGoal.update({ where: { id: goal.id }, data: { rankId: byName[to] } });
      }
      await tx.rank.delete({ where: { id: rank.id } });
      log(`Patente ${old} removida${moved.count ? ` (${moved.count} membro(s) → ${to})` : ""}`);
    }
    // patentes extras criadas no painel continuam, depois das oficiais
    const extras = await tx.rank.findMany({ where: { name: { notIn: LEVIATA_RANKS.map((r) => r.name) } }, orderBy: { order: "asc" } });
    let next = LEVIATA_RANKS.length + 1;
    for (const r of extras) await tx.rank.update({ where: { id: r.id }, data: { order: next++ } });
  });
  log(`Patentes: ${LEVIATA_RANKS.map((r) => r.name).join(" > ")}`);

  const sectorIds: Record<string, string> = {};
  for (const s of LEVIATA_SECTORS) {
    const row = await db.sector.upsert({ where: { name: s.name }, create: s, update: s });
    sectorIds[s.name] = row.id;
  }
  log(`Setores: ${LEVIATA_SECTORS.map((s) => s.name).join(", ")}`);
  for (const { sector, ...g } of LEVIATA_MANAGEMENTS) {
    const data = { ...g, sectorId: sector ? sectorIds[sector] : null };
    await db.management.upsert({ where: { name: g.name }, create: data, update: data });
  }
  log(`Gerências: ${LEVIATA_MANAGEMENTS.map((g) => g.name).join(", ")}`);
}
