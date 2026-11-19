import type { Permission } from "@/lib/permissions";
import {
  BookOpenIcon, CalendarDaysIcon, CoinsIcon, ExternalLinkIcon, HomeIcon, IdCardIcon, LayoutListIcon, MegaphoneIcon,
  ScrollTextIcon, UsersIcon, type AppIcon,
} from "@/components/icons";

export type NavLink = {
  href: string;
  label: string;
  perm?: Permission;
  /** módulo ainda não construído: aparece desabilitado com a fase prevista */
  soon?: string;
  /** link para fora do painel (abre em nova aba) */
  external?: boolean;
};

/** Item principal do menu (sidebar-08): link direto ou grupo que abre subitens. */
export type NavSection = {
  label: string;
  icon: AppIcon;
  href?: string;
  perm?: Permission;
  items?: NavLink[];
};

export const NAV_MAIN: NavSection[] = [
  { label: "Início", icon: HomeIcon, href: "/dashboard", perm: "painel.ver" },
  {
    label: "Fac",
    icon: UsersIcon,
    items: [
      { href: "/membros", label: "Membros", perm: "membros.ver" },
      { href: "/hierarquia", label: "Hierarquia", perm: "hierarquia.ver" },
      { href: "/ausencias", label: "Ausências", perm: "painel.ver" },
      { href: "/punicoes", label: "Punições", perm: "painel.ver" },
    ],
  },
  {
    label: "Operações",
    icon: CalendarDaysIcon,
    items: [
      { href: "/agenda", label: "Agenda", perm: "agenda.ver" },
      { href: "/escalacoes", label: "Escalações", perm: "escalacoes.ver" },
      { href: "/perimetros", label: "Perímetros", perm: "perimetros.ver" },
      { href: "/mapa", label: "Mapa", perm: "mapa.ver" },
    ],
  },
  {
    label: "Economia",
    icon: CoinsIcon,
    items: [
      { href: "/farm", label: "Farm", perm: "farm.ver" },
      { href: "/fabricacao", label: "Fabricação", perm: "fabricacao.ver" },
      { href: "/bau", label: "Baú", perm: "bau.ver" },
      { href: "/metas", label: "Metas de farm", perm: "metas.ver" },
      { href: "/encomendas", label: "Encomendas", perm: "encomendas.ver" },
      { href: "/vendas", label: "Vendas", perm: "vendas.ver" },
    ],
  },
  {
    label: "Cidade",
    icon: BookOpenIcon,
    items: [
      { href: "/lore", label: "Lore", perm: "lore.ver" },
      { href: "/faccoes", label: "Facções", perm: "faccoes.ver" },
      { href: "/dossie", label: "Dossiê", perm: "dossie.ver" },
    ],
  },
  {
    label: "Comunicação",
    icon: MegaphoneIcon,
    items: [
      { href: "/mural", label: "Mural & Flyers", perm: "mural.ver" },
      { href: "/lives", label: "Ao vivo", perm: "lives.ver" },
    ],
  },
];

/** Links secundários (rodapé do menu). */
/** Regras oficiais do servidor Cidade dos Anjos. */
export const CITY_RULES_URL = "https://regras.cdanjos.com/";

export const NAV_SECONDARY: (NavLink & { icon: AppIcon })[] = [
  { href: "/registro", label: "Meu registro", icon: IdCardIcon },
  { href: "/regras", label: "Regras da Leviatã", icon: ScrollTextIcon },
  { href: CITY_RULES_URL, label: "Regras da cidade", icon: ExternalLinkIcon, external: true },
  { href: "/auditoria", label: "Auditoria", icon: LayoutListIcon, perm: "auditoria.ver" },
];

/** Todos os links (para breadcrumb e testes). */
export type FlatNavLink = NavLink & { section?: string };

export const ALL_NAV_LINKS: FlatNavLink[] = [
  ...NAV_MAIN.flatMap((s): FlatNavLink[] =>
    s.href ? [{ href: s.href, label: s.label, perm: s.perm }] : (s.items ?? []).map((i) => ({ ...i, section: s.label })),
  ),
  ...NAV_SECONDARY.filter((l) => !l.external),
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
