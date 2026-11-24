/**
 * Permissões do painel — CRUD por área. Patentes, setores e gerências guardam listas dessas chaves
 * (`area.ver`, `area.criar`, `area.editar`, `area.apagar` e alguns extras). "admin" libera tudo.
 * Quem pode criar, editar ou apagar numa área também pode vê-la.
 */
export const CRUD_OPS = ["ver", "criar", "editar", "apagar"] as const;
export type CrudOp = (typeof CRUD_OPS)[number];
export const CRUD_LABELS: Record<CrudOp, string> = { ver: "Ver", criar: "Criar", editar: "Editar", apagar: "Apagar" };

export type AreaDef = {
  key: string;
  label: string;
  /** o que cada operação libera nesta área (só as que existem) */
  ops: Partial<Record<CrudOp, string>>;
  /** permissões a mais desta área, fora do CRUD */
  extras?: Record<string, string>;
};

export const PERMISSION_AREAS = [
  {
    label: "Fac",
    areas: [
      {
        key: "membros",
        label: "Membros",
        ops: { ver: "Ver a lista e as fichas", criar: "Cadastrar membros", editar: "Editar a ficha", apagar: "Desligar e readmitir" },
        extras: { "membros.patente": "Promover e rebaixar", "membros.setor": "Mudar o setor" },
      },
      { key: "hierarquia", label: "Hierarquia", ops: { ver: "Ver patentes, setores e gerências" } },
      { key: "patentes", label: "Patentes", ops: { criar: "Criar patentes", editar: "Editar patentes e suas permissões", apagar: "Apagar patentes" } },
      { key: "setores", label: "Setores", ops: { criar: "Criar setores", editar: "Editar setores e suas permissões", apagar: "Apagar setores" } },
      {
        key: "gerencias",
        label: "Gerências",
        ops: { criar: "Criar gerências", editar: "Editar gerências e dar gerências a membros", apagar: "Apagar gerências" },
      },
      {
        key: "ausencias",
        label: "Ausências",
        ops: { ver: "Ver as ausências de todos", criar: "Avisar a própria ausência", editar: "Aprovar e recusar", apagar: "Cancelar ausência de outros" },
      },
      {
        key: "punicoes",
        label: "Punições",
        ops: { ver: "Ver as punições de todos", criar: "Aplicar punições", editar: "Marcar como cumprida", apagar: "Revogar punições" },
      },
    ],
  },
  {
    label: "Operações",
    areas: [
      { key: "agenda", label: "Agenda", ops: { ver: "Ver a agenda e marcar presença", criar: "Agendar ações e corridas", editar: "Editar eventos e escrever relatórios", apagar: "Apagar eventos" } },
      { key: "escalacoes", label: "Escalações", ops: { ver: "Ver as escalações", editar: "Montar e publicar escalações" } },
      { key: "perimetros", label: "Perímetros", ops: { ver: "Ver os perímetros", criar: "Criar perímetros", editar: "Editar perímetros", apagar: "Apagar perímetros" } },
      { key: "mapa", label: "Mapa", ops: { ver: "Ver o mapa", criar: "Marcar lugares", editar: "Editar lugares e a imagem do mapa", apagar: "Apagar lugares" } },
    ],
  },
  {
    label: "Economia",
    areas: [
      { key: "farm", label: "Farm", ops: { ver: "Ver os guias de farm", criar: "Criar guias", editar: "Editar guias", apagar: "Apagar guias" } },
      { key: "fabricacao", label: "Fabricação", ops: { ver: "Ver itens e receitas", criar: "Criar itens e receitas", editar: "Editar itens e receitas", apagar: "Apagar itens e receitas" } },
      { key: "bau", label: "Baú", ops: { ver: "Ver o baú e entregar farm", criar: "Registrar movimentações", editar: "Conferir entregas", apagar: "Estornar movimentações" } },
      { key: "metas", label: "Metas de farm", ops: { ver: "Ver as metas", criar: "Criar metas", editar: "Mudar a quantidade", apagar: "Apagar metas" } },
      { key: "encomendas", label: "Encomendas", ops: { ver: "Ver as encomendas", criar: "Criar encomendas", editar: "Editar, mover e entregar", apagar: "Apagar encomendas" } },
      { key: "vendas", label: "Vendas", ops: { ver: "Ver as vendas", criar: "Registrar vendas", apagar: "Cancelar vendas" } },
    ],
  },
  {
    label: "Cidade",
    areas: [
      { key: "lore", label: "Lore", ops: { ver: "Ler a lore", criar: "Escrever artigos", editar: "Editar artigos", apagar: "Apagar artigos" } },
      { key: "faccoes", label: "Facções", ops: { ver: "Ver as facções", criar: "Cadastrar facções", editar: "Editar facções e o histórico", apagar: "Apagar facções" } },
      {
        key: "diario",
        label: "Diário",
        ops: { ver: "Ler o diário", criar: "Registrar acontecimentos (e mexer nos próprios)", editar: "Editar os registros dos outros", apagar: "Apagar os registros dos outros" },
      },
      { key: "dossie", label: "Dossiê", ops: { ver: "Ver o dossiê", criar: "Criar fichas", editar: "Editar fichas, placas e vínculos", apagar: "Apagar fichas" } },
    ],
  },
  {
    label: "Comunicação",
    areas: [
      { key: "mural", label: "Mural & Flyers", ops: { ver: "Ver o mural e votar", criar: "Publicar avisos e flyers", editar: "Editar e fixar avisos", apagar: "Apagar avisos e flyers" } },
      { key: "assistente", label: "Assistente (IA)", ops: { ver: "Usar o chat do assistente" } },
      { key: "lives", label: "Ao vivo", ops: { ver: "Ver quem está ao vivo", criar: "Adicionar o próprio canal", editar: "Atualizar as lives agora", apagar: "Remover canais de outros" } },
    ],
  },
  {
    label: "Gestão",
    areas: [
      { key: "regras", label: "Regras da Leviatã", ops: { criar: "Criar páginas", editar: "Editar páginas e ver o histórico", apagar: "Apagar páginas" } },
      { key: "auditoria", label: "Auditoria", ops: { ver: "Ver o log de auditoria" } },
    ],
  },
] as const satisfies readonly { label: string; areas: readonly AreaDef[] }[];

/** Permissões gerais, fora das áreas. */
export const GENERAL_PERMISSIONS = {
  "painel.ver": "Acessar o painel (Início)",
  admin: "Administrador (tudo)",
} as const;

type AnyArea = (typeof PERMISSION_AREAS)[number]["areas"][number];
type AreaPerms<A> = A extends { key: infer K extends string; ops: infer O }
  ? `${K}.${keyof O & string}` | (A extends { extras: infer E } ? keyof E & string : never)
  : never;
export type Permission = keyof typeof GENERAL_PERMISSIONS | AreaPerms<AnyArea>;

const ALL_AREAS: readonly AreaDef[] = PERMISSION_AREAS.flatMap((g) => g.areas as readonly AreaDef[]);

export const PERMISSIONS = Object.fromEntries([
  ...Object.entries(GENERAL_PERMISSIONS),
  ...ALL_AREAS.flatMap((a) => [
    ...Object.entries(a.ops).map(([op, desc]) => [`${a.key}.${op}`, `${a.label}: ${desc}`]),
    ...Object.entries(a.extras ?? {}).map(([k, desc]) => [k, `${a.label}: ${desc}`]),
  ]),
]) as Record<Permission, string>;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** Área que uma chave deixa ver (`lore.criar` → `lore`; patentes/setores/gerências → `hierarquia`). */
function areaOf(perm: string) {
  const area = perm.split(".")[0];
  return area === "patentes" || area === "setores" || area === "gerencias" ? "hierarquia" : area;
}

/**
 * Chaves que não existem mais → as atuais (expandidas em cadeia). As migrações
 * 20261113130000_permissoes_granulares e 20261119130000_permissoes_crud já converteram o banco;
 * isto é só rede de segurança. Chaves que mudaram de sentido mas mantiveram o nome
 * (ex.: `lore.editar`) só a migração converte.
 */
export const LEGACY_PERMISSIONS: Record<string, string[]> = {
  "membros.gerenciar": ["membros.cadastrar", "membros.editar", "membros.patente", "membros.setor", "membros.desligar"],
  "hierarquia.gerenciar": ["hierarquia.patentes", "hierarquia.setores", "hierarquia.gerencias"],
  "conteudo.editar": ["lore.editar", "faccoes.editar", "farm.editar", "fabricacao.editar", "mural.editar", "mapa.editar", "lives.gerenciar"],
  "operacoes.gerenciar": ["agenda.gerenciar", "escalacoes.gerenciar", "perimetros.gerenciar"],
  "financeiro.gerenciar": ["bau.gerenciar", "metas.gerenciar", "encomendas.gerenciar", "vendas.gerenciar"],
  "punicoes.gerenciar": ["punicoes.aplicar", "punicoes.revogar"],
  "dossie.gerenciar": ["dossie.ver", "dossie.editar"],
  "radar.ver": [],
  "economia.ver": ["farm.ver", "fabricacao.ver", "bau.ver", "metas.ver", "encomendas.ver", "vendas.ver"],
  "membros.cadastrar": ["membros.criar"],
  "membros.desligar": ["membros.apagar"],
  "hierarquia.patentes": ["patentes.criar", "patentes.editar", "patentes.apagar"],
  "hierarquia.setores": ["setores.criar", "setores.editar", "setores.apagar"],
  "hierarquia.gerencias": ["gerencias.criar", "gerencias.editar", "gerencias.apagar"],
  "lives.gerenciar": ["lives.editar", "lives.apagar"],
  "agenda.gerenciar": ["agenda.criar", "agenda.editar", "agenda.apagar"],
  "escalacoes.gerenciar": ["escalacoes.editar"],
  "perimetros.gerenciar": ["perimetros.criar", "perimetros.editar", "perimetros.apagar"],
  "bau.gerenciar": ["bau.criar", "bau.editar", "bau.apagar"],
  "metas.gerenciar": ["metas.criar", "metas.editar", "metas.apagar"],
  "encomendas.gerenciar": ["encomendas.criar", "encomendas.editar", "encomendas.apagar"],
  "vendas.gerenciar": ["vendas.criar", "vendas.apagar"],
  "punicoes.aplicar": ["punicoes.ver", "punicoes.criar"],
  "punicoes.revogar": ["punicoes.ver", "punicoes.editar", "punicoes.apagar"],
  "ausencias.gerenciar": ["ausencias.ver", "ausencias.editar", "ausencias.apagar"],
};

/** Troca chaves que não existem mais pelas atuais e remove repetidas. */
export function expandPermissions(perms: readonly string[]) {
  const out = new Set<string>();
  const visit = (p: string, depth: number) => {
    const next = LEGACY_PERMISSIONS[p];
    if (next && !(p in PERMISSIONS) && depth < 4) next.forEach((n) => visit(n, depth + 1));
    else out.add(p);
  };
  perms.forEach((p) => visit(p, 0));
  return [...out];
}

/** Permissões que NÃO liberam o "ver" da área (avisar a própria ausência não mostra as dos outros). */
const DOES_NOT_IMPLY_VIEW = new Set(["painel.ver", "ausencias.criar"]);

/** `area.ver` é liberado por qualquer outra permissão da área (quem cria/edita/apaga também vê). */
export function hasPermission(perms: readonly string[] | undefined | null, perm: Permission) {
  if (!perms) return false;
  const list = expandPermissions(perms);
  if (list.includes("admin") || list.includes(perm)) return true;
  if (perm.endsWith(".ver")) {
    const area = perm.slice(0, -".ver".length);
    return list.some((p) => !DOES_NOT_IMPLY_VIEW.has(p) && areaOf(p) === area);
  }
  return false;
}

/** Resumo legível de uma lista: "Administrador (tudo)" ou "Lore: ver, criar · Baú: ver". */
export function describePermissions(perms: readonly string[]) {
  const list = new Set(expandPermissions(perms));
  if (list.has("admin")) return GENERAL_PERMISSIONS.admin;
  const parts: string[] = [];
  if (list.has("painel.ver")) parts.push("Painel");
  for (const a of ALL_AREAS) {
    const ops = [
      ...CRUD_OPS.filter((op) => a.ops[op] && list.has(`${a.key}.${op}`)).map((op) => CRUD_LABELS[op].toLowerCase()),
      ...Object.entries(a.extras ?? {})
        .filter(([k]) => list.has(k))
        .map(([, d]) => d.toLowerCase()),
    ];
    if (ops.length) parts.push(`${a.label}: ${ops.join(", ")}`);
  }
  return parts.join(" · ");
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
