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
