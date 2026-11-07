/**
 * Permissões do painel. Cada patente (Rank) guarda uma lista dessas chaves.
 * "admin" libera tudo.
 */
export const PERMISSIONS = {
  "painel.ver": "Acessar o painel interno (cidade, comunicação, operações, membros e hierarquia)",
  "economia.ver": "Ver a economia: farm, fabricação, baú, metas e encomendas",
  "membros.gerenciar": "Cadastrar/editar membros e promover",
  "hierarquia.gerenciar": "Criar/editar patentes e permissões",
  "regras.editar": "Editar regras",
  "conteudo.editar": "Editar lore, facções, farm, fabricação, mural e mapa",
  "operacoes.gerenciar": "Agendar ações, montar escalações e perímetros",
  "financeiro.gerenciar": "Baú, metas de farm e encomendas",
  "punicoes.gerenciar": "Aplicar e revogar punições",
  "ausencias.gerenciar": "Aprovar/recusar avisos de ausência",
  "auditoria.ver": "Ver log de auditoria",
  admin: "Administrador (tudo)",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** Gerenciar implica ver (quem mexe no baú precisa enxergar a economia). */
const IMPLIED_BY: Partial<Record<Permission, Permission[]>> = {
  "economia.ver": ["financeiro.gerenciar"],
};

export function hasPermission(perms: readonly string[] | undefined | null, perm: Permission) {
  if (!perms) return false;
  if (perms.includes("admin") || perms.includes(perm)) return true;
  return (IMPLIED_BY[perm] ?? []).some((p) => perms.includes(p));
}

/** Discord IDs com acesso total "fantasma" (DEVELOPER_DISCORD_IDS): a patente exibida não muda. */
export function isDeveloper(discordId: string | null | undefined, raw = process.env.DEVELOPER_DISCORD_IDS) {
  if (!discordId || !raw) return false;
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(discordId);
}
