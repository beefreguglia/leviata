import { describe, expect, it } from "vitest";
import { ALL_NAV_LINKS, NAV_MAIN, NAV_SECONDARY, isActivePath } from "@/components/layout/nav";
import { ALL_PERMISSIONS } from "@/lib/permissions";

describe("menu lateral (sidebar-08)", () => {
  it("não tem links duplicados", () => {
    const hrefs = ALL_NAV_LINKS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("só usa permissões que existem", () => {
    for (const i of ALL_NAV_LINKS) if (i.perm) expect(ALL_PERMISSIONS).toContain(i.perm);
  });

  it("todos os módulos do plano estão no menu", () => {
    const expected = ["/dashboard", "/membros", "/hierarquia", "/regras", "/ausencias", "/auditoria", "/punicoes", "/lore",
      "/faccoes", "/mapa", "/perimetros", "/agenda", "/escalacoes", "/farm", "/fabricacao", "/bau", "/encomendas", "/mural", "/lives", "/radar", "/dossie"];
    for (const href of expected) expect(ALL_NAV_LINKS.map((i) => i.href)).toContain(href);
  });

  it("cada item principal é link direto OU grupo com subitens", () => {
    for (const s of NAV_MAIN) expect(Boolean(s.href) !== Boolean(s.items?.length)).toBe(true);
  });

  it("subitens sabem a que seção pertencem (breadcrumb)", () => {
    expect(ALL_NAV_LINKS.find((l) => l.href === "/membros")?.section).toBe("Fac");
    expect(ALL_NAV_LINKS.find((l) => l.href === "/dashboard")?.section).toBeUndefined();
  });

  it("Regras fica visível para todos (inclusive recrutas)", () => {
    expect(NAV_SECONDARY.find((i) => i.href === "/regras")?.perm).toBeUndefined();
  });

  it("isActivePath reconhece subpáginas sem confundir prefixos", () => {
    expect(isActivePath("/membros/123", "/membros")).toBe(true);
    expect(isActivePath("/membros", "/membros")).toBe(true);
    expect(isActivePath("/membrosx", "/membros")).toBe(false);
  });
});
