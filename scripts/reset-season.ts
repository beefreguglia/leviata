/**
 * Reset de início de season. Sem --confirmar só mostra o que faria.
 *
 *   npm run season:reset                 simulação (não altera nada)
 *   npm run season:reset -- --confirmar  apaga de verdade, sem cópia de segurança
 *
 * Zera o banco e as imagens enviadas e recria patentes, setores, gerências e regras iniciais.
 * O logo do menu e os demais arquivos de /public/brand não são afetados.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { planSeasonReset, rebuildSeasonBase, SEASON_WIPED_TABLES, wipeSeasonData } from "../prisma/season-reset";

const confirmed = process.argv.includes("--confirmar");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Faltam as variáveis do banco. Confira o arquivo .env.production.local.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Remove os arquivos em lotes. Devolve quantos não saíram (arquivo órfão não atrapalha o painel). */
async function removeFiles(keys: string[]) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn(`Sem SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: ${keys.length} arquivo(s) ficaram no storage.`);
    return keys.length;
  }
  const bucket = process.env.SUPABASE_BUCKET || "leviata";
  let failed = 0;
  for (let i = 0; i < keys.length; i += 100) {
    const prefixes = keys.slice(i, i + 100);
    const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) {
      failed += prefixes.length;
      console.error(`Supabase recusou um lote de ${prefixes.length} arquivo(s) (${res.status}).`);
    }
  }
  return failed;
}

async function main() {
  console.log(`Banco: ${new URL(connectionString!).host}`);
  const plan = await planSeasonReset(db);

  console.log("\nVai apagar:");
  for (const [table, count] of Object.entries(plan.wiped)) if (count) console.log(`  ${table.padEnd(18)} ${count}`);
  console.log(`  ${"Configurações".padEnd(18)} ${plan.settings}`);
  console.log("\nVai apagar e recriar do zero:");
  for (const [table, count] of Object.entries(plan.rebuilt)) console.log(`  ${table.padEnd(18)} ${count}`);

  if (!confirmed) {
    console.log("\nSimulação: nada foi alterado. Para apagar de verdade: npm run season:reset -- --confirmar");
    return;
  }

  const { fileKeys } = await wipeSeasonData(db);
  console.log("\nDados apagados.");
  await rebuildSeasonBase(db, console.log);
  const failedFiles = fileKeys.length ? await removeFiles(fileKeys) : 0;
  console.log(`Arquivos de imagem removidos: ${fileKeys.length - failedFiles} de ${fileKeys.length}`);

  const after = await planSeasonReset(db);
  const left = SEASON_WIPED_TABLES.filter((table) => after.wiped[table] > 0);
  if (left.length) {
    console.error(`\nAinda há dados em: ${left.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (failedFiles) process.exitCode = 1;
  console.log("\nReset concluído. Cada pessoa entra de novo com o Discord e refaz o Meu registro.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
