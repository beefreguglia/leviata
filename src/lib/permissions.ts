/**
 * Permissões do painel. Cada patente (Rank) guarda uma lista dessas chaves.
 * "admin" libera tudo.
 */
export const PERMISSIONS = {
  "painel.ver": "Acessar o painel interno",
  "economia.ver": "Ver a economia (farm, fabricação, baú, metas e encomendas)",
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

/**
 * Acesso total "fantasma": os Discord IDs de BOOTSTRAP_ADMIN_DISCORD_IDS podem tudo,
 * mas a ficha continua mostrando a patente cadastrada (ex.: Recruta).
 */
export function isDeveloper(discordId: string | null | undefined, raw = process.env.BOOTSTRAP_ADMIN_DISCORD_IDS) {
  if (!discordId || !raw) return false;
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(discordId);
}
