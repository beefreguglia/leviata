import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "./seed-data";
import { seedExamples } from "./seed-examples";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

seed(db)
  .then(() => seedExamples(db))
  .then(() => console.log("Seed concluído: patentes, usuários de teste, regras e conteúdo de exemplo."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
