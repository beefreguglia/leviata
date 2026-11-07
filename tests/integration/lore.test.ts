import { describe, expect, it } from "vitest";
import { createLore, deleteLore, updateLore } from "@/app/(painel)/lore/actions";
import { actAs, db, form, makeUpload } from "../helpers/db";

const redirectTo = (path: string) => ({ digest: expect.stringContaining(`;${path};`) });

describe("lore", () => {
  it("cria artigo com capa, tags e redireciona para o slug", async () => {
    const coverId = await makeUpload();
    await actAs("dev-gerente");
    await expect(
      createLore(form({ title: "A Queda do Cartel", content: "## Tudo", category: "EVENTO", happenedAt: "2026-10-10", tags: "Cartel, porto", coverId })),
    ).rejects.toMatchObject(redirectTo("/lore/a-queda-do-cartel"));
    const a = await db.loreArticle.findUniqueOrThrow({ where: { slug: "a-queda-do-cartel" }, include: { author: true } });
    expect(a).toMatchObject({ category: "EVENTO", tags: ["cartel", "porto"], coverId });
    expect(a.author?.rpName).toBe("Rafa Cardoso");
  });

  it("título repetido ganha sufixo no slug", async () => {
    await actAs("dev-gerente");
    await expect(createLore(form({ title: "Origem", content: "x" }))).rejects.toMatchObject(redirectTo("/lore/origem"));
    await expect(createLore(form({ title: "Origem", content: "y" }))).rejects.toMatchObject(redirectTo("/lore/origem-2"));
  });

  it("capa com id inexistente é ignorada", async () => {
    await actAs("dev-gerente");
    await expect(createLore(form({ title: "Sem capa", content: "x", coverId: "falso" }))).rejects.toBeDefined();
    expect((await db.loreArticle.findFirstOrThrow()).coverId).toBeNull();
  });

  it("editar mantém o slug se o título não mudar; muda se mudar", async () => {
    await actAs("dev-gerente");
    await createLore(form({ title: "Primeiro nome", content: "x" })).catch(() => {});
    const a = await db.loreArticle.findFirstOrThrow();
    await expect(updateLore(a.id, form({ title: "Primeiro nome", content: "editado" }))).rejects.toMatchObject(redirectTo("/lore/primeiro-nome"));
    await expect(updateLore(a.id, form({ title: "Nome novo", content: "editado" }))).rejects.toMatchObject(redirectTo("/lore/nome-novo"));
  });

  it("apagar guarda o texto na auditoria; soldado não pode", async () => {
    await actAs("dev-gerente");
    await createLore(form({ title: "Para apagar", content: "segredo" })).catch(() => {});
    const a = await db.loreArticle.findFirstOrThrow();
    await actAs("dev-soldado");
    expect((await deleteLore(a.id)).ok).toBe(false);
    await actAs("dev-lider");
    await expect(deleteLore(a.id)).rejects.toMatchObject(redirectTo("/lore"));
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "lore.delete" } });
    expect((log.data as { content: string }).content).toBe("segredo");
  });

  it("validação sem redirecionar", async () => {
    await actAs("dev-gerente");
    expect(await createLore(form({ title: "ab", content: "x" }))).toEqual({ ok: false, error: "Título muito curto" });
  });
});
