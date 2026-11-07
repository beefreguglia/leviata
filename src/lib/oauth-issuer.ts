/**
 * O Discord passou a mandar `iss` (RFC 9207) no retorno do OAuth. O Auth.js trata o Discord
 * como OAuth2 sem emissor e compara com "https://authjs.dev" → todo login falha com
 * `unexpected "iss" (issuer) response parameter value`.
 *
 * Aqui conferimos nós mesmos que o `iss` é do Discord e o removemos antes do Auth.js.
 * Um `iss` de outro domínio é mantido (o Auth.js recusa, como deve).
 */
export function isDiscordIssuer(iss: string) {
  try {
    const u = new URL(iss);
    return u.protocol === "https:" && (u.hostname === "discord.com" || u.hostname.endsWith(".discord.com"));
  } catch {
    return false;
  }
}

/** URL do callback sem o `iss` do Discord; null se não precisa mexer. */
export function stripDiscordIssuer(href: string): string | null {
  const url = new URL(href);
  if (!url.pathname.endsWith("/callback/discord")) return null;
  const iss = url.searchParams.get("iss");
  if (iss == null || !isDiscordIssuer(iss)) return null;
  url.searchParams.delete("iss");
  return url.toString();
}
