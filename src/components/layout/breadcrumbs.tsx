"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ALL_NAV_LINKS } from "./nav";

const SUBPAGES: Record<string, string> = { editar: "Editar", historico: "Histórico", nova: "Nova", novo: "Novo" };

/** Nome da página de detalhe (/modulo/:id) em cada módulo. */
const DETAIL: Record<string, string> = {
  "/membros": "Ficha",
  "/regras": "Página",
  "/lore": "Artigo",
  "/faccoes": "Ficha",
  "/farm": "Guia",
  "/fabricacao": "Receita",
  "/perimetros": "Perímetro",
  "/agenda": "Evento",
};

/** Breadcrumb a partir da URL: Seção › Módulo › subpágina. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const base = ALL_NAV_LINKS.find((l) => l.href === `/${parts[0]}`);
  if (!base) return null;

  const crumbs: { label: string; href?: string }[] = [];
  if (base.section) crumbs.push({ label: base.section });
  crumbs.push({ label: base.label, href: base.href });

  const rest = parts.slice(1);
  if (rest[0] && SUBPAGES[rest[0]]) crumbs.push({ label: SUBPAGES[rest[0]] });
  else if (rest[0]) {
    crumbs.push({ label: DETAIL[base.href] ?? "Detalhe", href: `${base.href}/${rest[0]}` });
    if (rest[1]) crumbs.push({ label: SUBPAGES[rest[1]] ?? rest[1] });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className={last ? undefined : "hidden md:block"}>
                {last ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : c.href ? (
                  <BreadcrumbLink render={<Link href={c.href} />}>{c.label}</BreadcrumbLink>
                ) : (
                  <span>{c.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
