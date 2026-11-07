/**
 * Ajuste de produção (nov/2026): nova estrutura da Leviatã — patentes, setores e gerências ligados aos cargos do Discord.
 * Uso: carregue .env.production.local e rode `npx tsx prisma/update-prod-setores.ts`. Idempotente.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyLeviataStructure } from "./leviata-structure";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! }) });

applyLeviataStructure(db, console.log)
  .then(() => console.log("Estrutura da Leviatã aplicada."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
