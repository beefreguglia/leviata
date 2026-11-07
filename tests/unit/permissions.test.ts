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

describe("economia e desenvolvedor", () => {
  it("gerenciar o financeiro implica ver a economia", async () => {
    const { hasPermission } = await import("@/lib/permissions");
    expect(hasPermission(["financeiro.gerenciar"], "economia.ver")).toBe(true);
    expect(hasPermission(["painel.ver"], "economia.ver")).toBe(false);
  });
  it("isDeveloper lê a lista de IDs", async () => {
    const { isDeveloper } = await import("@/lib/permissions");
    expect(isDeveloper("2", "1, 2;3")).toBe(true);
    expect(isDeveloper("4", "1,2")).toBe(false);
    expect(isDeveloper("1", undefined)).toBe(false);
    expect(isDeveloper(null, "1")).toBe(false);
  });
});
