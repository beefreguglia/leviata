const DISCORD_API = "https://discord.com/api/v10";

export type GuildMember = {
  roles: string[];
  nick: string | null;
  user?: { id: string; username: string; global_name?: string | null; avatar: string | null };
};

/**
 * Busca a ficha do usuário logado dentro do servidor da Leviata usando o token OAuth
 * (scope `guilds.members.read`). Retorna null se ele não estiver no servidor.
 */
export async function getGuildMember(accessToken: string, guildId: string): Promise<GuildMember | null> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Discord respondeu ${res.status} ao buscar membro do servidor`);
  return res.json();
}

export function discordAvatarUrl(userId: string, avatar: string | null | undefined) {
  if (!avatar) return null;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`;
}

type WebhookEmbed = {
  title: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
};

/** Envia uma mensagem para um webhook do Discord. Falhas são só logadas (não quebram a ação). */
export async function sendWebhook(url: string | undefined, embed: WebhookEmbed) {
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Painel Leviata",
        embeds: [{ color: 0x00d9ff, timestamp: new Date().toISOString(), ...embed }],
      }),
    });
    if (!res.ok) console.error("Webhook Discord falhou:", res.status, await res.text());
  } catch (err) {
    console.error("Webhook Discord falhou:", err);
  }
}
