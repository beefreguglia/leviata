/**
 * Ajuste único de produção (nov/2026): permissões novas das patentes e regras oficiais da Leviatã.
 * Uso: carregue .env.production.local e rode `npx tsx prisma/update-prod-2026-11.ts`.
 * Idempotente: pode rodar de novo sem duplicar nada.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ESTATUTO, GERENCIA, MEMBRO } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }) });

async function main() {
  for (const [name, permissions] of [
    ["Gerente", GERENCIA],
    ["Soldado", MEMBRO],
    ["Recruta", MEMBRO],
  ] as const) {
    const r = await db.rank.updateMany({ where: { name }, data: { permissions: [...permissions] } });
    console.log(`${name}: ${r.count ? permissions.join(", ") : "patente não encontrada"}`);
  }

  const page = await db.rulePage.findUnique({ where: { slug: "estatuto" } });
  if (page && page.content !== ESTATUTO) {
    await db.rulePage.update({
      where: { id: page.id },
      data: { title: "Regras da Leviatã", content: ESTATUTO, isPublic: true, versions: { create: { title: "Regras da Leviatã", content: ESTATUTO } } },
    });
    console.log("Estatuto atualizado com as regras da Leviatã (versão anterior fica no histórico).");
  } else {
    console.log(page ? "Estatuto já está atualizado." : "Página 'estatuto' não existe.");
  }
}

main().finally(() => db.$disconnect());
