/**
 * Reset de início de season: zera o banco e recria só o que o painel precisa para funcionar
 * (patentes, setores, gerências e regras iniciais). A identidade visual fica em /public/brand e não é afetada.
 * O comando que usa isto é `scripts/reset-season.ts`. Tabela nova precisa entrar numa das listas abaixo.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { applyLeviataStructure } from "./leviata-structure";
import { seedRules } from "./seed-data";

/** Apagadas e não voltam, na ordem em que as chaves estrangeiras permitem (filhos antes dos pais). */
export const SEASON_WIPED_TABLES = [
  "PollVote",
  "PollOption",
  "Notice",
  "Flyer",
  "Attendance",
  "LineupSlot",
  "EventReport",
  "Event",
  "Perimeter",
  "MapPin",
  "FarmGoal",
  "VaultTransaction",
  "Order",
  "Sale",
  "RecipeInput",
  "Recipe",
  "FarmGuide",
  "Item",
  "FactionEvent",
  "Faction",
  "LoreArticle",
  "StreamChannel",
  "Punishment",
  "Absence",
  "Promotion",
  "AuditLog",
  "Upload",
  "Member",
  "User",
] as const;

/** Apagadas e recriadas do zero por `rebuildSeasonBase`. */
export const SEASON_REBUILT_TABLES = ["RuleVersion", "RulePage", "Management", "Sector", "Rank"] as const;

/** Única configuração que fica: sem ela, o próximo deploy repetiria no Discord um aviso já postado. */
const KEPT_SETTING = "changelog.anunciados";

const countOf = async (db: PrismaClient, table: string) => {
  const [{ count }] = await db.$queryRawUnsafe<{ count: number }[]>(`SELECT count(*)::int AS count FROM "${table}"`);
  return count;
};

/** Quanto cada tabela tem hoje. Não altera nada. */
export async function planSeasonReset(db: PrismaClient) {
  const wiped: Record<string, number> = {};
  for (const table of SEASON_WIPED_TABLES) wiped[table] = await countOf(db, table);
  const rebuilt: Record<string, number> = {};
  for (const table of SEASON_REBUILT_TABLES) rebuilt[table] = await countOf(db, table);
  const settings = await db.setting.count({ where: { key: { not: KEPT_SETTING } } });
  return { wiped, rebuilt, settings };
}

/**
 * Apaga tudo numa transação só (ou vai tudo, ou nada).
 * Devolve os caminhos das imagens apagadas, para remover os arquivos do storage depois do commit.
 */
export async function wipeSeasonData(db: PrismaClient) {
  const uploads = db.$queryRawUnsafe(`DELETE FROM "Upload" RETURNING key`);
  const results = await db.$transaction([
    uploads,
    ...[...SEASON_WIPED_TABLES.filter((table) => table !== "Upload"), ...SEASON_REBUILT_TABLES].map((table) => db.$executeRawUnsafe(`DELETE FROM "${table}"`)),
    db.$executeRawUnsafe(`DELETE FROM "Setting" WHERE key <> $1`, KEPT_SETTING),
  ]);
  return { fileKeys: (results[0] as { key: string }[]).map((row) => row.key) };
}

/** Recria patentes, setores, gerências (com os cargos do Discord) e as regras iniciais. */
export async function rebuildSeasonBase(db: PrismaClient, log: (msg: string) => void = () => {}) {
  await applyLeviataStructure(db, log);
  await seedRules(db);
  log("Regras iniciais recriadas");
}
