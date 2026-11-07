/** O que está configurado (sem revelar valores) — usado em /api/health e no guia de deploy. */
export function configStatus(env: Record<string, string | undefined> = process.env) {
  const has = (k: string) => Boolean(env[k]?.trim());
  return {
    auth: has("AUTH_SECRET"),
    discordLogin: has("AUTH_DISCORD_ID") && has("AUTH_DISCORD_SECRET") && has("DISCORD_GUILD_ID"),
    publicUrl: has("AUTH_URL"),
    storage: has("SUPABASE_URL") && has("SUPABASE_SERVICE_ROLE_KEY") ? "supabase" : "local",
    webhooks: { avisos: has("DISCORD_WEBHOOK_AVISOS"), acoes: has("DISCORD_WEBHOOK_ACOES"), lives: has("DISCORD_WEBHOOK_LIVES") },
    lives: { twitch: has("TWITCH_CLIENT_ID") && has("TWITCH_CLIENT_SECRET"), youtube: has("YOUTUBE_API_KEY"), cron: has("CRON_SECRET") },
    bootstrapAdmins: has("BOOTSTRAP_ADMIN_DISCORD_IDS"),
    devLoginOn: env.AUTH_DEV_LOGIN === "true" && env.NODE_ENV !== "production",
  };
}

/** Problemas que impedem a produção de funcionar. */
export function productionProblems(env: Record<string, string | undefined> = process.env) {
  const s = configStatus(env);
  const problems: string[] = [];
  if (!env.DATABASE_URL) problems.push("DATABASE_URL ausente");
  if (!s.auth) problems.push("AUTH_SECRET ausente");
  if (!s.discordLogin) problems.push("Login do Discord incompleto (AUTH_DISCORD_ID, AUTH_DISCORD_SECRET, DISCORD_GUILD_ID)");
  if (s.storage === "local") problems.push("Sem Supabase Storage: imagens não funcionam na Vercel (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  if (env.AUTH_DEV_LOGIN === "true") problems.push("AUTH_DEV_LOGIN deve ficar vazio em produção");
  return problems;
}
