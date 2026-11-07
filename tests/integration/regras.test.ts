import { beforeEach, describe, expect, it } from "vitest";
import { createRule, deleteRule, updateRule } from "@/app/(painel)/regras/actions";
import { actAs, db, form, setRankPerms, GERENCIA_COMPLETA } from "../helpers/db";

// estes testes cobrem as regras de cada ação para uma gerência com essas permissões
// (as permissões padrão de cada patente estão em permissoes-padrao.test.ts)
beforeEach(async () => {
  await setRankPerms("Gerente", GERENCIA_COMPLETA);
});

const redirectTo = (path: string) => ({ digest: expect.stringContaining(`;${path};`) });

describe("regras", () => {
  it("cria página, gera slug, primeira versão e redireciona", async () => {
    await actAs("dev-gerente");
    await expect(createRule(form({ title: "Regras de Ação", content: "## Rádio\n- frequência 1", isPublic: "on" }))).rejects.toMatchObject(
      redirectTo("/regras/regras-de-acao"),
    );
    const page = await db.rulePage.findUniqueOrThrow({ where: { slug: "regras-de-acao" }, include: { versions: true } });
    expect(page.isPublic).toBe(true);
    expect(page.versions).toHaveLength(1);
  });

  it("título repetido gera slug diferente", async () => {
    await actAs("dev-gerente");
    await expect(createRule(form({ title: "Estatuto", content: "x" }))).rejects.toMatchObject({ digest: expect.stringContaining("/regras/estatuto-") });
    expect(await db.rulePage.count({ where: { slug: { startsWith: "estatuto" } } })).toBe(2);
  });

  it("editar salva nova versão com autor", async () => {
    await actAs("dev-gerente");
    const page = await db.rulePage.findUniqueOrThrow({ where: { slug: "estatuto" } });
    await expect(updateRule(page.id, form({ title: "Estatuto", content: "novo texto", isPublic: "on" }))).rejects.toMatchObject(
      redirectTo("/regras/estatuto"),
    );
    const versions = await db.ruleVersion.findMany({ where: { pageId: page.id }, include: { author: true }, orderBy: { createdAt: "asc" } });
    expect(versions).toHaveLength(2);
    expect(versions[1]).toMatchObject({ content: "novo texto" });
    expect(versions[1].author?.rpName).toBe("Rafa Cardoso");
  });

  it("erro de validação não redireciona", async () => {
    await actAs("dev-gerente");
    expect(await createRule(form({ title: "X", content: "x" }))).toEqual({ ok: false, error: "Título muito curto" });
  });

  it("soldado não cria nem edita", async () => {
    await actAs("dev-soldado");
    expect((await createRule(form({ title: "Hack", content: "x" }))).ok).toBe(false);
    const page = await db.rulePage.findUniqueOrThrow({ where: { slug: "estatuto" } });
    expect((await updateRule(page.id, form({ title: "Hack", content: "x" }))).ok).toBe(false);
  });

  it("apagar remove página e guarda o conteúdo na auditoria", async () => {
    await actAs("dev-lider");
    const page = await db.rulePage.findUniqueOrThrow({ where: { slug: "conduta" } });
    await expect(deleteRule(page.id)).rejects.toMatchObject(redirectTo("/regras"));
    expect(await db.rulePage.findUnique({ where: { id: page.id } })).toBeNull();
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "rule.delete" } });
    expect((log.data as { content: string }).content).toContain("Advertências");
  });
});
