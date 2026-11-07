// Recria o banco de teste (chamado pelo global-setup do Playwright via tsx).
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { resetDatabase, seed } from "../prisma/seed-data";

config({ path: ".env.test", override: true, quiet: true });

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });

resetDatabase(db)
  .then(() => seed(db))
  .finally(() => db.$disconnect());
