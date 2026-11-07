import { describe, expect, it } from "vitest";
import { createRank, deleteRank, updateRank } from "@/app/(painel)/hierarquia/actions";
import { actAs, db, form, rankId } from "../helpers/db";

const order = async () => (await db.rank.findMany({ orderBy: { order: "asc" } })).map((r) => `${r.order}:${r.name}`);
const rankForm = (o: Partial<Record<string, string | string[]>> = {}) =>
  form({ name: "Conselheiro", order: "6", color: "#00d9ff", discordRoleId: "", ...o } as Record<string, string | string[]>);

describe("hierarquia", () => {
  it("só quem tem hierarquia.gerenciar cria patente", async () => {
    await actAs("dev-gerente");
    expect(await createRank(rankForm())).toEqual({ ok: false, error: "Sem permissão para esta ação" });
  });

  it("cria patente no fim da fila", async () => {
    await actAs("dev-lider");
    expect(await createRank(rankForm({ permissions: ["painel.ver"] }))).toEqual({ ok: true, message: "Patente Conselheiro criada" });
    expect(await order()).toEqual(["1:Líder", "2:Sub-líder", "3:Gerente", "4:Soldado", "5:Recruta", "6:Conselheiro"]);
  });

  it("criar numa posição ocupada empurra as de baixo", async () => {
    await actAs("dev-lider");
    await createRank(rankForm({ order: "3" }));
    expect(await order()).toEqual(["1:Líder", "2:Sub-líder", "3:Conselheiro", "4:Gerente", "5:Soldado", "6:Recruta"]);
  });

  it("mudar a ordem troca de lugar com a patente que estava lá", async () => {
    await actAs("dev-lider");
    const id = await rankId("Recruta");
    expect((await updateRank(id, rankForm({ name: "Recruta", order: "4" }))).ok).toBe(true);
    expect(await order()).toEqual(["1:Líder", "2:Sub-líder", "3:Gerente", "4:Recruta", "5:Soldado"]);
  });

  it("salva cargo do Discord e permissões", async () => {
    await actAs("dev-lider");
    const id = await rankId("Soldado");
    await updateRank(id, rankForm({ name: "Soldado", order: "4", discordRoleId: "123456", permissions: ["painel.ver", "regras.editar"] }));
    const r = await db.rank.findUniqueOrThrow({ where: { id } });
    expect(r.discordRoleId).toBe("123456");
    expect(r.permissions).toEqual(["painel.ver", "regras.editar"]);
  });

  it("não deixa tirar o admin da própria patente", async () => {
    await actAs("dev-lider");
    const id = await rankId("Líder");
    expect(await updateRank(id, rankForm({ name: "Líder", order: "1", permissions: ["painel.ver"] }))).toEqual({
      ok: false,
      error: "Você não pode remover o admin da sua própria patente",
    });
  });

  it("não apaga patente que tem membros", async () => {
    await actAs("dev-lider");
    const r = await deleteRank(await rankId("Soldado"));
    expect(r).toEqual({ ok: false, error: "Mova os 1 membros desta patente antes de apagar" });
  });

  it("apaga patente vazia e registra na auditoria", async () => {
    await actAs("dev-lider");
    const id = await rankId("Sub-líder");
    expect((await deleteRank(id)).ok).toBe(true);
    expect(await db.rank.findUnique({ where: { id } })).toBeNull();
    expect(await db.auditLog.count({ where: { action: "rank.delete" } })).toBe(1);
  });

  it("nome duplicado dá erro", async () => {
    await actAs("dev-lider");
    expect((await createRank(rankForm({ name: "Gerente" }))).ok).toBe(false);
  });
});
