/**
 * Permissões do painel. Patentes, setores e gerências guardam listas dessas chaves.
 * "admin" libera tudo. Cada chave libera uma coisa só — monte o acesso marcando uma por uma.
 */
export const PERMISSION_GROUPS = [
  {
    label: "Geral",
    items: {
      "painel.ver": "Acessar o painel interno",
      admin: "Administrador (tudo)",
    },
  },
  {
    label: "Membros",
    items: {
      "membros.cadastrar": "Cadastrar membros",
      "membros.editar": "Editar a ficha dos membros",
      "membros.patente": "Promover e rebaixar (mudar patente)",
      "membros.setor": "Mudar o setor dos membros",
      "membros.desligar": "Desligar e readmitir membros",
    },
  },
  {
    label: "Hierarquia",
    items: {
      "hierarquia.patentes": "Criar e editar patentes e suas permissões",
      "hierarquia.setores": "Criar e editar setores",
      "hierarquia.gerencias": "Criar e editar gerências e dar gerências a membros",
    },
  },
  {
    label: "Conteúdo",
    items: {
      "regras.editar": "Editar regras",
      "lore.editar": "Editar a lore",
      "faccoes.editar": "Editar facções",
      "farm.editar": "Editar guias de farm",
      "fabricacao.editar": "Editar receitas de fabricação",
      "mural.editar": "Publicar e editar avisos do mural",
      "mapa.editar": "Marcar lugares no mapa",
      "lives.gerenciar": "Gerenciar canais de live de todos",
    },
  },
  {
    label: "Operações",
    items: {
      "agenda.gerenciar": "Agendar ações e corridas e escrever relatórios",
      "escalacoes.gerenciar": "Montar e publicar escalações",
      "perimetros.gerenciar": "Criar e editar perímetros",
    },
  },
  {
    label: "Economia",
    items: {
      "economia.ver": "Ver a economia (farm, fabricação, baú, metas, encomendas e vendas)",
      "bau.gerenciar": "Movimentar o baú e conferir entregas",
      "metas.gerenciar": "Definir metas de farm",
      "encomendas.gerenciar": "Gerenciar encomendas",
      "vendas.gerenciar": "Registrar vendas",
    },
  },
  {
    label: "Gestão",
    items: {
      "punicoes.aplicar": "Aplicar punições",
      "punicoes.revogar": "Encerrar e revogar punições",
      "ausencias.gerenciar": "Aprovar e recusar avisos de ausência",
      "radar.ver": "Ver o radar de inatividade",
      "auditoria.ver": "Ver o log de auditoria",
      "dossie.ver": "Ver o dossiê de pessoas da cidade",
      "dossie.editar": "Editar o dossiê",
    },
  },
] as const;

type GroupItems = (typeof PERMISSION_GROUPS)[number]["items"];
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Permission = KeysOfUnion<GroupItems>;

export const PERMISSIONS = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => Object.entries(g.items))) as Record<Permission, string>;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * Chaves antigas (antes de ficarem granulares) → as novas que elas cobriam.
 * A migração 20261113130000_permissoes_granulares já converteu o banco; isto é só rede de segurança.
 */
export const LEGACY_PERMISSIONS: Record<string, Permission[]> = {
  "membros.gerenciar": ["membros.cadastrar", "membros.editar", "membros.patente", "membros.setor", "membros.desligar"],
  "hierarquia.gerenciar": ["hierarquia.patentes", "hierarquia.setores", "hierarquia.gerencias"],
  "conteudo.editar": ["lore.editar", "faccoes.editar", "farm.editar", "fabricacao.editar", "mural.editar", "mapa.editar", "lives.gerenciar"],
  "operacoes.gerenciar": ["agenda.gerenciar", "escalacoes.gerenciar", "perimetros.gerenciar"],
  "financeiro.gerenciar": ["bau.gerenciar", "metas.gerenciar", "encomendas.gerenciar", "vendas.gerenciar"],
  "punicoes.gerenciar": ["punicoes.aplicar", "punicoes.revogar"],
  "dossie.gerenciar": ["dossie.ver", "dossie.editar"],
};

/** Troca chaves antigas pelas novas e remove repetidas. */
export function expandPermissions(perms: readonly string[]) {
  return [...new Set(perms.flatMap((p) => LEGACY_PERMISSIONS[p] ?? [p]))];
}

/** Quem gerencia algo precisa enxergar a área (ex.: quem mexe no baú vê a economia). */
const IMPLIED_BY: Partial<Record<Permission, Permission[]>> = {
  "economia.ver": ["bau.gerenciar", "metas.gerenciar", "encomendas.gerenciar", "vendas.gerenciar", "farm.editar", "fabricacao.editar"],
  "dossie.ver": ["dossie.editar"],
};

export function hasPermission(perms: readonly string[] | undefined | null, perm: Permission) {
  if (!perms) return false;
  if (perms.includes("admin") || perms.includes(perm)) return true;
  if ((IMPLIED_BY[perm] ?? []).some((p) => perms.includes(p))) return true;
  // chave antiga que ainda esteja salva em algum lugar
  return perms.some((p) => LEGACY_PERMISSIONS[p]?.some((n) => n === perm || (IMPLIED_BY[perm] ?? []).includes(n)));
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
