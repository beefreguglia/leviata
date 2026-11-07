/**
 * Permissões do painel. Cada patente (Rank) guarda uma lista dessas chaves.
 * "admin" libera tudo.
 */
export const PERMISSIONS = {
  "painel.ver": "Acessar o painel interno",
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

export function hasPermission(perms: readonly string[] | undefined | null, perm: Permission) {
  if (!perms) return false;
  return perms.includes("admin") || perms.includes(perm);
}
