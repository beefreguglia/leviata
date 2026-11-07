// Seed de PRODUÇÃO: estrutura da Leviatã (patentes, setores, gerências) e regras. Não cria usuários de teste.
// Uso: DATABASE_URL=... npm run db:seed:prod
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedRules } from "./seed-data";
import { applyLeviataStructure } from "./leviata-structure";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! }) });

(async () => {
  await applyLeviataStructure(db, console.log);
  await seedRules(db);
  console.log("Produção: estrutura da Leviatã e regras iniciais criadas (sem usuários de teste).");
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
