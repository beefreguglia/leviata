import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, PERMISSIONS, hasPermission } from "@/lib/permissions";

describe("hasPermission", () => {
  it("libera quando a permissão está na lista", () => {
    expect(hasPermission(["painel.ver"], "painel.ver")).toBe(true);
  });

  it("nega quando a permissão não está na lista", () => {
    expect(hasPermission(["painel.ver"], "regras.editar")).toBe(false);
  });

  it("admin libera qualquer permissão", () => {
    for (const perm of ALL_PERMISSIONS) expect(hasPermission(["admin"], perm)).toBe(true);
  });

  it("lista vazia, null ou undefined nega tudo", () => {
    expect(hasPermission([], "painel.ver")).toBe(false);
    expect(hasPermission(null, "painel.ver")).toBe(false);
    expect(hasPermission(undefined, "painel.ver")).toBe(false);
  });

  it("toda permissão tem descrição em português", () => {
    for (const perm of ALL_PERMISSIONS) expect(PERMISSIONS[perm].length).toBeGreaterThan(3);
  });
});

describe("CRUD por área e desenvolvedor", () => {
  it("criar, editar ou apagar numa área libera ver a área", async () => {
    const { hasPermission } = await import("@/lib/permissions");
    expect(hasPermission(["bau.criar"], "bau.ver")).toBe(true);
    expect(hasPermission(["patentes.editar"], "hierarquia.ver")).toBe(true);
    expect(hasPermission(["membros.patente"], "membros.ver")).toBe(true);
    expect(hasPermission(["painel.ver"], "bau.ver")).toBe(false);
    // avisar a própria ausência não mostra as ausências dos outros
    expect(hasPermission(["ausencias.criar"], "ausencias.ver")).toBe(false);
  });
  it("isDeveloper lê a lista de IDs", async () => {
    const { isDeveloper } = await import("@/lib/permissions");
    expect(isDeveloper("2", "1, 2;3")).toBe(true);
    expect(isDeveloper("4", "1,2")).toBe(false);
    expect(isDeveloper("1", undefined)).toBe(false);
    expect(isDeveloper(null, "1")).toBe(false);
  });
});

describe("permissões granulares", () => {
  it("chaves que não existem mais viram as atuais (rede de segurança)", async () => {
    const { expandPermissions, hasPermission } = await import("@/lib/permissions");
    expect(expandPermissions(["painel.ver", "punicoes.gerenciar", "painel.ver"])).toEqual(["painel.ver", "punicoes.ver", "punicoes.criar", "punicoes.editar", "punicoes.apagar"]);
    expect(hasPermission(["conteudo.editar"], "mapa.editar")).toBe(true);
    expect(hasPermission(["economia.ver"], "vendas.ver")).toBe(true);
    expect(hasPermission(["financeiro.gerenciar"], "bau.apagar")).toBe(true);
    expect(hasPermission(["conteudo.editar"], "regras.editar")).toBe(false);
  });
  it("cada permissão libera só a sua operação", async () => {
    const { hasPermission } = await import("@/lib/permissions");
    expect(hasPermission(["lore.editar"], "mural.editar")).toBe(false);
    expect(hasPermission(["lore.editar"], "lore.apagar")).toBe(false);
    expect(hasPermission(["lore.criar"], "lore.editar")).toBe(false);
    expect(hasPermission(["dossie.ver"], "dossie.editar")).toBe(false);
    expect(hasPermission(["punicoes.criar"], "punicoes.apagar")).toBe(false);
  });
  it("todas as chaves estão em alguma área, sem repetir", async () => {
    const { PERMISSION_AREAS, GENERAL_PERMISSIONS, ALL_PERMISSIONS } = await import("@/lib/permissions");
    const keys = [
      ...Object.keys(GENERAL_PERMISSIONS),
      ...PERMISSION_AREAS.flatMap((g) => g.areas.flatMap((a) => [...Object.keys(a.ops).map((op) => `${a.key}.${op}`), ...Object.keys("extras" in a ? a.extras : {})])),
    ];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(ALL_PERMISSIONS.length);
  });
});
