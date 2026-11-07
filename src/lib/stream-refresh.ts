import "server-only";
import { db } from "@/lib/db";
import { sendWebhook } from "@/lib/discord";
import { OFFLINE, STREAM_URL, fetchKick, fetchTwitch, fetchYoutube, type LiveStatus } from "@/lib/streams";
import type { StreamChannel } from "@/generated/prisma/client";

/** Intervalo mínimo entre atualizações automáticas. */
export const STREAM_MAX_AGE_MS = 2 * 60 * 1000;

let running: Promise<RefreshSummary> | null = null;

export type RefreshSummary = { checked: number; live: number; wentLive: number; errors: number; skipped?: boolean };

/** Atualiza só se o dado mais antigo tiver mais de 2 min (chamado ao abrir o painel). */
export async function refreshStreamsIfStale(maxAgeMs = STREAM_MAX_AGE_MS) {
  // e2e: não consulta APIs externas
  if (process.env.STREAM_REFRESH_DISABLED === "true") return { checked: 0, live: 0, wentLive: 0, errors: 0, skipped: true } satisfies RefreshSummary;
  const stale = await db.streamChannel.findFirst({
    where: { OR: [{ checkedAt: null }, { checkedAt: { lt: new Date(Date.now() - maxAgeMs) } }] },
    select: { id: true },
  });
  if (!stale) return { checked: 0, live: 0, wentLive: 0, errors: 0, skipped: true } satisfies RefreshSummary;
  return refreshStreams();
}

/** Consulta todas as plataformas e grava o status. Uma execução por vez. */
export function refreshStreams(): Promise<RefreshSummary> {
  running ??= doRefresh().finally(() => {
    running = null;
  });
  return running;
}

async function doRefresh(): Promise<RefreshSummary> {
  const channels = await db.streamChannel.findMany({ include: { member: true } });
  const statuses = new Map<string, LiveStatus | Error>();

  // Twitch: tudo numa chamada
  const twitch = channels.filter((c) => c.platform === "TWITCH");
  if (twitch.length) {
    try {
      const res = await fetchTwitch(twitch.map((c) => c.handle));
      for (const c of twitch) statuses.set(c.id, res.get(c.handle.toLowerCase()) ?? OFFLINE);
    } catch (err) {
      for (const c of twitch) statuses.set(c.id, err as Error);
    }
  }
  // Kick e YouTube: um por canal
  await Promise.all(
    channels
      .filter((c) => c.platform !== "TWITCH")
      .map(async (c) => {
        try {
          statuses.set(c.id, c.platform === "KICK" ? await fetchKick(c.handle) : await fetchYoutube(c.handle));
        } catch (err) {
          statuses.set(c.id, err as Error);
        }
      }),
  );

  const now = new Date();
  const summary: RefreshSummary = { checked: channels.length, live: 0, wentLive: 0, errors: 0 };
  const newlyLive: (StreamChannel & { member: { rpName: string } })[] = [];

  for (const c of channels) {
    const st = statuses.get(c.id);
    if (!st || st instanceof Error) {
      summary.errors++;
      await db.streamChannel.update({
        where: { id: c.id },
        data: { checkedAt: now, lastError: st instanceof Error ? st.message.slice(0, 200) : "Sem resposta" },
      });
      continue;
    }
    if (st.isLive) summary.live++;
    if (st.isLive && !c.isLive) {
      summary.wentLive++;
      newlyLive.push({ ...c, ...st, member: c.member });
    }
    await db.streamChannel.update({
      where: { id: c.id },
      data: { ...st, checkedAt: now, lastError: null },
    });
  }

  const hook = process.env.DISCORD_WEBHOOK_LIVES || process.env.DISCORD_WEBHOOK_AVISOS;
  for (const c of newlyLive) {
    await sendWebhook(hook, {
      title: `🔴 ${c.member.rpName} entrou ao vivo`,
      description: c.title ?? undefined,
      url: STREAM_URL[c.platform](c.handle),
      color: 0xf75a68,
      fields: [{ name: "Plataforma", value: c.platform[0] + c.platform.slice(1).toLowerCase(), inline: true }],
    });
  }
  return summary;
}
