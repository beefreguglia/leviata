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
      { href: "/membros", label: "Membros", perm: "painel.ver" },
      { href: "/hierarquia", label: "Hierarquia", perm: "painel.ver" },
      { href: "/ausencias", label: "Ausências", perm: "painel.ver" },
      { href: "/punicoes", label: "Punições", perm: "painel.ver" },
      { href: "/radar", label: "Radar de inatividade", perm: "radar.ver" },
    ],
  },
  {
    label: "Operações",
    icon: CalendarDaysIcon,
    items: [
      { href: "/agenda", label: "Agenda", perm: "painel.ver" },
      { href: "/escalacoes", label: "Escalações", perm: "painel.ver" },
      { href: "/perimetros", label: "Perímetros", perm: "painel.ver" },
      { href: "/mapa", label: "Mapa", perm: "painel.ver" },
    ],
  },
  {
    label: "Economia",
    icon: CoinsIcon,
    items: [
      { href: "/farm", label: "Farm", perm: "economia.ver" },
      { href: "/fabricacao", label: "Fabricação", perm: "economia.ver" },
      { href: "/bau", label: "Baú", perm: "economia.ver" },
      { href: "/metas", label: "Metas de farm", perm: "economia.ver" },
      { href: "/encomendas", label: "Encomendas", perm: "economia.ver" },
      { href: "/vendas", label: "Vendas", perm: "economia.ver" },
    ],
  },
  {
    label: "Cidade",
    icon: BookOpenIcon,
    items: [
      { href: "/lore", label: "Lore", perm: "painel.ver" },
      { href: "/faccoes", label: "Facções", perm: "painel.ver" },
      { href: "/dossie", label: "Dossiê", perm: "dossie.ver" },
    ],
  },
  {
    label: "Comunicação",
    icon: MegaphoneIcon,
    items: [
      { href: "/mural", label: "Mural & Flyers", perm: "painel.ver" },
      { href: "/lives", label: "Ao vivo", perm: "painel.ver" },
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
