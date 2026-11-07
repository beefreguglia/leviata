import { db } from "@/lib/db";
import { discordAvatarUrl, getGuildMember } from "@/lib/discord";

export type DiscordProfileLike = {
  id?: string | number;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
};

/**
 * Sincroniza o usuário do Discord com o banco:
 * - garante User;
 * - escolhe a patente mais alta cujo cargo do Discord ele tem;
 * - cria a ficha de membro na primeira vez (se tiver algum cargo mapeado).
 */
/** Discord IDs que recebem a patente mais alta no primeiro acesso (ver DEPLOY.md). */
export function isBootstrapAdmin(discordId: string, raw = process.env.BOOTSTRAP_ADMIN_DISCORD_IDS) {
  if (!raw) return false;
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(discordId);
}

export async function syncDiscordUser(params: {
  discordId: string;
  username: string;
  avatarUrl: string | null;
  nick: string | null;
  roles: string[];
  /** sem servidor configurado: cria a ficha mesmo sem patente (a liderança promove depois) */
  createWithoutRank?: boolean;
}) {
  const user = await db.user.upsert({
    where: { discordId: params.discordId },
    create: {
      discordId: params.discordId,
      username: params.username,
      avatarUrl: params.avatarUrl,
      lastLoginAt: new Date(),
    },
    update: { username: params.username, avatarUrl: params.avatarUrl, lastLoginAt: new Date() },
    include: { member: true },
  });

  let rank = await db.rank.findFirst({
    where: { discordRoleId: { in: params.roles } },
    orderBy: { order: "asc" },
  });

  // Primeiro acesso em produção: IDs listados em BOOTSTRAP_ADMIN_DISCORD_IDS entram com a patente
  // mais alta enquanto ainda não têm patente (para poderem configurar os cargos do Discord).
  const needsBootstrap = isBootstrapAdmin(params.discordId) && !rank && !user.member?.rankId;
  if (needsBootstrap) {
    rank = await db.rank.findFirst({ orderBy: { order: "asc" } });
  }

  if (user.member) {
    // Cargo no Discord manda: se mudou lá, atualiza aqui (e registra promoção).
    if (rank && user.member.rankId !== rank.id) {
      await db.$transaction([
        db.member.update({ where: { id: user.member.id }, data: { rankId: rank.id } }),
        db.promotion.create({
          data: {
            memberId: user.member.id,
            fromRankId: user.member.rankId,
            toRankId: rank.id,
            reason: needsBootstrap ? "Acesso inicial (BOOTSTRAP_ADMIN_DISCORD_IDS)" : "Sincronizado do cargo no Discord",
          },
        }),
      ]);
    }
  } else if (rank || params.createWithoutRank) {
    await db.member.create({
      data: { rpName: params.nick ?? params.username, userId: user.id, rankId: rank?.id ?? null },
    });
  }

  return user;
}


/**
 * Decide o login via Discord: confere config, se a pessoa está no servidor e sincroniza.
 * Retorna true (entra) ou uma URL de /login com o erro.
 *
 * Sem DISCORD_GUILD_ID (servidor ainda não conectado): qualquer conta do Discord entra,
 * ganha uma ficha SEM patente (só vê as regras públicas) e a liderança promove em Membros.
 * IDs em BOOTSTRAP_ADMIN_DISCORD_IDS entram com a patente mais alta.
 */
export async function discordSignIn(params: {
  accessToken?: string;
  guildId?: string;
  profile?: DiscordProfileLike;
}): Promise<true | string> {
  const { accessToken, guildId, profile } = params;
  if (!accessToken || !profile?.id) return "/login?erro=config";

  const discordId = String(profile.id);
  const base = {
    discordId,
    username: profile.global_name || profile.username || "sem-nome",
    avatarUrl: discordAvatarUrl(discordId, profile.avatar),
  };

  if (!guildId) {
    await syncDiscordUser({ ...base, nick: null, roles: [], createWithoutRank: true });
    return true;
  }

  const guildMember = await getGuildMember(accessToken, guildId);
  if (!guildMember) return "/login?erro=fora-do-servidor";

  // está no servidor: entra mesmo sem cargo ligado a uma patente (ficha sem patente; a liderança
  // liga o cargo em Hierarquia ou promove em Membros)
  await syncDiscordUser({
    ...base,
    nick: guildMember.nick,
    roles: guildMember.roles,
    createWithoutRank: true,
  });
  return true;
}
