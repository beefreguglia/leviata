/**
 * Posta no Discord a novidade mais recente do painel (src/lib/changelog.ts) que ainda não foi anunciada.
 * Roda no fim do build da Vercel (só em produção) e nunca derruba o deploy.
 *   - precisa de DISCORD_WEBHOOK_NOVIDADES (sem ele, não faz nada)
 *   - guarda os ids já anunciados no banco (Setting "changelog.anunciados")
 *   - na primeira vez, marca as antigas como anunciadas e posta só a mais nova (sem spam)
 * Manual: `npx tsx scripts/announce-changelog.ts --force` (ignora o VERCEL_ENV).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CHANGELOG, changelogEmbed, pendingAnnouncements } from "../src/lib/changelog";

const KEY = "changelog.anunciados";

export async function announce(
  db: PrismaClient,
  { webhook, panelUrl, fetchImpl = fetch }: { webhook?: string; panelUrl?: string; fetchImpl?: typeof fetch },
) {
  if (!webhook) return { posted: null as string | null, reason: "sem DISCORD_WEBHOOK_NOVIDADES" };
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const announced = Array.isArray(row?.value) ? (row!.value as string[]) : [];
  const pending = pendingAnnouncements(CHANGELOG, announced);
  if (!pending.length) return { posted: null, reason: "nada novo" };

  const latest = pending[0];
  const res = await fetchImpl(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Painel Leviatã",
      embeds: [{ color: 0x06d4ec, timestamp: new Date(`${latest.date}T12:00:00-03:00`).toISOString(), ...changelogEmbed(latest, panelUrl) }],
    }),
  });
  if (!res.ok) throw new Error(`Discord respondeu ${res.status}`);
  // a mais nova foi postada; as mais antigas pendentes ficam marcadas para não virarem spam
  const value = [...announced, ...pending.map((e) => e.id)];
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return { posted: latest.id, reason: "ok" };
}

async function main() {
  const force = process.argv.includes("--force");
  if (!force && process.env.VERCEL_ENV !== "production") {
    console.log("Novidades: só anuncio em produção (use --force para testar).");
    return;
  }
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) return console.log("Novidades: sem banco configurado.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const r = await announce(db, { webhook: process.env.DISCORD_WEBHOOK_NOVIDADES, panelUrl: process.env.AUTH_URL });
    console.log(r.posted ? `Novidades: anunciado "${r.posted}" no Discord.` : `Novidades: ${r.reason}.`);
  } finally {
    await db.$disconnect();
  }
}

// só roda quando chamado direto (os testes importam `announce`)
if (process.argv[1]?.includes("announce-changelog")) {
  main().catch((err) => {
    // nunca derruba o deploy por causa do aviso
    console.error("Novidades: falhou ao anunciar —", err instanceof Error ? err.message : err);
  });
}
