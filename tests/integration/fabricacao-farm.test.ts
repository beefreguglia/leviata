import { describe, expect, it } from "vitest";
import { createItem, createRecipe, deleteItem, deleteRecipe, updateRecipe } from "@/app/(painel)/fabricacao/actions";
import { createFarmGuide, deleteFarmGuide, updateFarmGuide } from "@/app/(painel)/farm/actions";
import { actAs, db, form, makeUpload } from "../helpers/db";

async function items(...names: string[]) {
  await actAs("dev-gerente");
  for (const n of names) expect((await createItem(form({ name: n }))).ok).toBe(true);
  return Object.fromEntries((await db.item.findMany()).map((i) => [i.name, i.id]));
}

describe("itens", () => {
  it("cadastra e bloqueia nome repetido", async () => {
    await actAs("dev-gerente");
    expect(await createItem(form({ name: "Metal", unit: "kg", isIllegal: "on" }))).toEqual({ ok: true, message: "Metal cadastrado" });
    expect(await createItem(form({ name: "metal" }))).toEqual({ ok: false, error: "O item Metal já existe" });
    expect(await db.item.findFirstOrThrow()).toMatchObject({ unit: "kg", isIllegal: true });
  });

  it("não apaga item usado como insumo", async () => {
    const i = await items("Metal", "Peça");
    await createRecipe(form({ outputItemId: i["Peça"], outputQty: "1", inputItemId: [i.Metal], inputQty: ["3"] }));
    const r = await deleteItem(i.Metal);
    expect(r).toEqual({ ok: false, error: "Metal é insumo de 1 receita(s). Remova das receitas antes." });
  });
});

describe("receitas", () => {
  it("cria, edita (troca insumos) e apaga", async () => {
    const i = await items("Metal", "Pólvora", "Munição");
    expect((await createRecipe(form({ outputItemId: i["Munição"], outputQty: "10", minutes: "5", inputItemId: [i.Metal, i["Pólvora"]], inputQty: ["1", "20"] }))).ok).toBe(true);
    const r = await db.recipe.findFirstOrThrow({ include: { inputs: true } });
    expect(r.inputs).toHaveLength(2);

    await updateRecipe(r.id, form({ outputItemId: i["Munição"], outputQty: "10", inputItemId: [i["Pólvora"]], inputQty: ["25"] }));
    const after = await db.recipe.findFirstOrThrow({ include: { inputs: true } });
    expect(after.inputs.map((x) => [x.itemId, x.quantity])).toEqual([[i["Pólvora"], 25]]);

    expect((await deleteRecipe(r.id)).ok).toBe(true);
    expect(await db.recipeInput.count()).toBe(0);
  });

  it("uma receita por item", async () => {
    const i = await items("Metal", "Peça");
    await createRecipe(form({ outputItemId: i["Peça"], inputItemId: [i.Metal], inputQty: ["3"] }));
    expect(await createRecipe(form({ outputItemId: i["Peça"], inputItemId: [i.Metal], inputQty: ["2"] }))).toEqual({
      ok: false,
      error: "Peça já tem receita. Edite a existente.",
    });
  });

  it("bloqueia receita circular", async () => {
    const i = await items("Aço", "Barra", "Cano");
    expect(Object.keys(i)).toHaveLength(3);
    await createRecipe(form({ outputItemId: i.Barra, inputItemId: [i["Aço"]], inputQty: ["1"] }));
    await createRecipe(form({ outputItemId: i.Cano, inputItemId: [i.Barra], inputQty: ["1"] }));
    const r = await createRecipe(form({ outputItemId: i["Aço"], inputItemId: [i.Cano], inputQty: ["1"] }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("Receita circular: Aço → Cano → Barra → Aço");
  });
});

describe("farm", () => {
  const redirectTo = (path: string) => ({ digest: expect.stringContaining(path) });

  it("cria guia ligado a item, com prints válidos", async () => {
    const i = await items("Metal");
    const img = await makeUpload();
    await expect(
      createFarmGuide(form({ title: "Metal na reciclagem", itemId: i.Metal, location: "La Puerta", howTo: "x", amountPerRun: "12", minutesPerRun: "6", risk: "BAIXO", imageIds: [img, "falso"] })),
    ).rejects.toMatchObject(redirectTo("/farm/"));
    const g = await db.farmGuide.findFirstOrThrow();
    expect(g).toMatchObject({ itemId: i.Metal, amountPerRun: 12, imageIds: [img] });
  });

  it("item inexistente é recusado", async () => {
    await actAs("dev-gerente");
    expect(await createFarmGuide(form({ title: "Algo bom", itemId: "falso", location: "Lugar", howTo: "x" }))).toEqual({ ok: false, error: "Item inválido" });
  });

  it("editar e apagar; soldado não pode", async () => {
    await actAs("dev-gerente");
    await createFarmGuide(form({ title: "Guia velho", location: "Lugar", howTo: "x" })).catch(() => {});
    const g = await db.farmGuide.findFirstOrThrow();
    await expect(updateFarmGuide(g.id, form({ title: "Guia novo", location: "Lugar", howTo: "y", risk: "ALTO" }))).rejects.toMatchObject(redirectTo(`/farm/${g.id}`));
    expect(await db.farmGuide.findFirstOrThrow()).toMatchObject({ title: "Guia novo", risk: "ALTO" });
    await actAs("dev-soldado");
    expect((await deleteFarmGuide(g.id)).ok).toBe(false);
    await actAs("dev-gerente");
    await expect(deleteFarmGuide(g.id)).rejects.toMatchObject(redirectTo(";/farm;"));
  });
});
