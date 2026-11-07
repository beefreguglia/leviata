/**
 * Status de live na Twitch, Kick e YouTube.
 * Os "parse*" são puros (testados com respostas de exemplo); os "fetch*" chamam as APIs.
 */

export type LiveStatus = {
  isLive: boolean;
  title: string | null;
  viewers: number | null;
  thumbnailUrl: string | null;
  category: string | null;
  startedAt: Date | null;
};

export const OFFLINE: LiveStatus = {
  isLive: false,
  title: null,
  viewers: null,
  thumbnailUrl: null,
  category: null,
  startedAt: null,
};

export const STREAM_URL = {
  TWITCH: (h: string) => `https://twitch.tv/${h}`,
  KICK: (h: string) => `https://kick.com/${h}`,
  YOUTUBE: (h: string) => `https://youtube.com/channel/${h}/live`,
} as const;

const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);

// ---------------- Twitch (Helix) ----------------
type TwitchStream = {
  user_login: string;
  type: string;
  title?: string;
  viewer_count?: number;
  thumbnail_url?: string;
  game_name?: string;
  started_at?: string;
};

/** Resposta de GET /helix/streams → status por login (quem não aparece está offline). */
export function parseTwitchStreams(json: { data?: TwitchStream[] }, logins: string[]) {
  const result = new Map<string, LiveStatus>(logins.map((l) => [l.toLowerCase(), OFFLINE]));
  for (const s of json.data ?? []) {
    if (s.type !== "live") continue;
    result.set(s.user_login.toLowerCase(), {
      isLive: true,
      title: s.title ?? null,
      viewers: s.viewer_count ?? null,
      thumbnailUrl: s.thumbnail_url ? s.thumbnail_url.replace("{width}", "640").replace("{height}", "360") : null,
      category: s.game_name || null,
      startedAt: date(s.started_at),
    });
  }
  return result;
}

let twitchToken: { value: string; expiresAt: number } | null = null;

async function getTwitchToken(clientId: string, secret: string) {
  if (twitchToken && twitchToken.expiresAt > Date.now() + 60_000) return twitchToken.value;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch recusou as credenciais (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  twitchToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return twitchToken.value;
}

export async function fetchTwitch(logins: string[]): Promise<Map<string, LiveStatus>> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Twitch não configurada (TWITCH_CLIENT_ID/SECRET)");
  const token = await getTwitchToken(clientId, secret);
  const result = new Map<string, LiveStatus>();
  for (let i = 0; i < logins.length; i += 100) {
    const batch = logins.slice(i, i + 100);
    const qs = new URLSearchParams(batch.map((l) => ["user_login", l]));
    const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, {
      headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Twitch respondeu ${res.status}`);
    for (const [k, v] of parseTwitchStreams(await res.json(), batch)) result.set(k, v);
  }
  return result;
}

// ---------------- Kick ----------------
type KickChannel = {
  livestream?: {
    is_live?: boolean;
    session_title?: string;
    viewer_count?: number;
    thumbnail?: { url?: string } | null;
    categories?: { name?: string }[];
    created_at?: string;
    start_time?: string;
  } | null;
};

export function parseKickChannel(json: KickChannel): LiveStatus {
  const ls = json.livestream;
  if (!ls || ls.is_live === false) return OFFLINE;
  return {
    isLive: true,
    title: ls.session_title ?? null,
    viewers: ls.viewer_count ?? null,
    thumbnailUrl: ls.thumbnail?.url ?? null,
    category: ls.categories?.[0]?.name ?? null,
    startedAt: date(ls.start_time ?? ls.created_at),
  };
}

export async function fetchKick(slug: string): Promise<LiveStatus> {
  const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (PainelLeviata)" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Canal não encontrado na Kick");
  if (!res.ok) throw new Error(`Kick respondeu ${res.status}`);
  return parseKickChannel(await res.json());
}

// ---------------- YouTube (RSS grátis + videos.list = 1 unidade) ----------------
/** IDs dos vídeos mais recentes no feed RSS do canal. */
export function extractYoutubeVideoIds(rss: string, limit = 5) {
  const ids = [...rss.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)].map((m) => m[1]);
  return [...new Set(ids)].slice(0, limit);
}

type YoutubeVideo = {
  id: string;
  snippet?: { title?: string; liveBroadcastContent?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } };
  liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string; concurrentViewers?: string };
};

export function parseYoutubeVideos(json: { items?: YoutubeVideo[] }): LiveStatus {
  const live = (json.items ?? []).find(
    (v) => v.liveStreamingDetails?.actualStartTime && !v.liveStreamingDetails.actualEndTime,
  );
  if (!live) return OFFLINE;
  return {
    isLive: true,
    title: live.snippet?.title ?? null,
    viewers: live.liveStreamingDetails?.concurrentViewers ? Number(live.liveStreamingDetails.concurrentViewers) : null,
    thumbnailUrl: live.snippet?.thumbnails?.high?.url ?? live.snippet?.thumbnails?.medium?.url ?? null,
    category: null,
    startedAt: date(live.liveStreamingDetails?.actualStartTime),
  };
}

export async function fetchYoutube(channelId: string): Promise<LiveStatus> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YouTube não configurado (YOUTUBE_API_KEY)");
  const rss = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
    cache: "no-store",
  });
  if (rss.status === 404) throw new Error("Canal não encontrado no YouTube");
  if (!rss.ok) throw new Error(`YouTube (RSS) respondeu ${rss.status}`);
  const ids = extractYoutubeVideoIds(await rss.text());
  if (!ids.length) return OFFLINE;
  const qs = new URLSearchParams({ part: "snippet,liveStreamingDetails", id: ids.join(","), key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status}`);
  return parseYoutubeVideos(await res.json());
}
