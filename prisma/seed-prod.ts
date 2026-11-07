// Seed de PRODUÇÃO: só patentes e regras iniciais. Não cria usuários de teste.
// Uso: DATABASE_URL=... npm run db:seed:prod
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedRanks, seedRules } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! }) });

(async () => {
  await seedRanks(db);
  await seedRules(db);
  console.log("Produção: patentes e regras iniciais criadas (sem usuários de teste).");
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
