import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { formToObject, runAction } from "@/lib/actions";

describe("runAction", () => {
  it("retorna ok com a mensagem da função", async () => {
    await expect(runAction(async () => "Salvo!")).resolves.toEqual({ ok: true, message: "Salvo!" });
  });

  it("retorna ok sem mensagem quando a função não devolve nada", async () => {
    await expect(runAction(async () => {})).resolves.toEqual({ ok: true, message: undefined });
  });

  it("converte Error em mensagem amigável", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(runAction(async () => { throw new Error("Sem permissão"); })).resolves.toEqual({
      ok: false,
      error: "Sem permissão",
    });
  });

  it("mostra a primeira mensagem de validação do zod", async () => {
    const result = await runAction(async () => {
      z.object({ nome: z.string().min(3, "Nome curto") }).parse({ nome: "a" });
    });
    expect(result).toEqual({ ok: false, error: "Nome curto" });
  });

  it("deixa o redirect do Next passar (não engole)", async () => {
    const { redirect } = await import("next/navigation");
    await expect(runAction(async () => redirect("/x"))).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("formToObject", () => {
  it("transforma campos simples e repetidos", () => {
    const fd = new FormData();
    fd.append("nome", "Dante");
    fd.append("perm", "a");
    fd.append("perm", "b");
    fd.append("perm", "c");
    expect(formToObject(fd)).toEqual({ nome: "Dante", perm: ["a", "b", "c"] });
  });

  it("ignora arquivos", () => {
    const fd = new FormData();
    fd.append("foto", new Blob(["x"]), "x.png");
    expect(formToObject(fd)).toEqual({});
  });
});

describe("toast depois do redirect", () => {
  it("anexa o código na URL (com ou sem query)", async () => {
    const { withFlash } = await import("@/lib/flash");
    expect(withFlash("/lore/x", "criado")).toBe("/lore/x?ok=criado");
    expect(withFlash("/agenda?mes=2026-11", "apagado")).toBe("/agenda?mes=2026-11&ok=apagado");
  });
});
