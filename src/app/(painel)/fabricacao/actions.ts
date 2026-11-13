"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { CraftCycleError, planCraft, type CraftRecipe } from "@/lib/crafting";
import { parseItemForm, parseRecipeForm } from "@/lib/schemas/content";

function revalidate() {
  revalidatePath("/fabricacao");
  revalidatePath("/farm", "layout");
}

async function ensureItemNameFree(name: string, exceptId?: string) {
  const other = await db.item.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (other && other.id !== exceptId) throw new Error(`O item ${other.name} já existe`);
}

export async function createItem(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const data = parseItemForm(fd);
    await ensureItemNameFree(data.name);
    const item = await db.item.create({ data });
    await audit({ userId: viewer.user.id, action: "item.create", entity: "Item", entityId: item.id, summary: `Cadastrou o item ${item.name}` });
    revalidate();
    return `${item.name} cadastrado`;
  });
}

export async function updateItem(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const data = parseItemForm(fd);
    await ensureItemNameFree(data.name, id);
    const item = await db.item.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "item.update", entity: "Item", entityId: id, summary: `Editou o item ${item.name}` });
    revalidate();
    return "Item atualizado";
  });
}

export async function deleteItem(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const item = await db.item.findUniqueOrThrow({ where: { id }, include: { _count: { select: { usedIn: true, producedBy: true } } } });
    if (item._count.usedIn > 0) throw new Error(`${item.name} é insumo de ${item._count.usedIn} receita(s). Remova das receitas antes.`);
    await db.item.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "item.delete", entity: "Item", entityId: id, summary: `Apagou o item ${item.name}` });
    revalidate();
    return "Item apagado";
  });
}

/** Garante que a nova receita não cria um ciclo (A precisa de B que precisa de A). */
async function ensureNoCycle(candidate: CraftRecipe) {
  const others = await db.recipe.findMany({ where: { id: { not: candidate.id } }, include: { inputs: true } });
  const recipes: CraftRecipe[] = [candidate, ...others.filter((r) => r.outputItemId !== candidate.outputItemId)];
  try {
    planCraft(candidate.outputItemId, 1, recipes);
  } catch (err) {
    if (err instanceof CraftCycleError) {
      const names = await db.item.findMany({ where: { id: { in: err.itemIds } } });
      const byId = new Map(names.map((i) => [i.id, i.name]));
      throw new Error(`Receita circular: ${err.itemIds.map((i) => byId.get(i) ?? "?").join(" → ")}`);
    }
    throw err;
  }
}

async function ensureOneRecipePerItem(outputItemId: string, exceptId?: string) {
  const other = await db.recipe.findFirst({ where: { outputItemId, id: exceptId ? { not: exceptId } : undefined }, include: { outputItem: true } });
  if (other) throw new Error(`${other.outputItem.name} já tem receita. Edite a existente.`);
}

export async function createRecipe(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const { inputs, ...data } = parseRecipeForm(fd);
    await ensureOneRecipePerItem(data.outputItemId);
    await ensureNoCycle({ id: "nova", outputItemId: data.outputItemId, outputQty: data.outputQty, minutes: data.minutes, inputs });
    const recipe = await db.recipe.create({
      data: { ...data, inputs: { create: inputs } },
      include: { outputItem: true },
    });
    await audit({ userId: viewer.user.id, action: "recipe.create", entity: "Recipe", entityId: recipe.id, summary: `Cadastrou a receita de ${recipe.outputItem.name}` });
    revalidate();
    return `Receita de ${recipe.outputItem.name} salva`;
  });
}

export async function updateRecipe(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const { inputs, ...data } = parseRecipeForm(fd);
    await ensureOneRecipePerItem(data.outputItemId, id);
    await ensureNoCycle({ id, outputItemId: data.outputItemId, outputQty: data.outputQty, minutes: data.minutes, inputs });
    const recipe = await db.$transaction(async (tx) => {
      await tx.recipeInput.deleteMany({ where: { recipeId: id } });
      return tx.recipe.update({ where: { id }, data: { ...data, inputs: { create: inputs } }, include: { outputItem: true } });
    });
    await audit({ userId: viewer.user.id, action: "recipe.update", entity: "Recipe", entityId: id, summary: `Editou a receita de ${recipe.outputItem.name}` });
    revalidate();
    return "Receita atualizada";
  });
}

export async function deleteRecipe(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("fabricacao.editar");
    const recipe = await db.recipe.delete({ where: { id }, include: { outputItem: true } });
    await audit({ userId: viewer.user.id, action: "recipe.delete", entity: "Recipe", entityId: id, summary: `Apagou a receita de ${recipe.outputItem.name}` });
    revalidate();
    return "Receita apagada";
  });
}
