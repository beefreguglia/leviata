"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseGoalForm } from "@/lib/schemas/finance";

function revalidate() {
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function createGoal(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const data = parseGoalForm(fd);
    const item = await db.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Item inválido");
    const rank = data.rankId ? await db.rank.findUnique({ where: { id: data.rankId } }) : null;
    if (data.rankId && !rank) throw new Error("Patente inválida");
    const exists = await db.farmGoal.findFirst({ where: { itemId: data.itemId, rankId: data.rankId } });
    if (exists) throw new Error(`Já existe meta de ${item.name} ${rank ? `para ${rank.name}` : "geral"} — edite a existente`);
    const goal = await db.farmGoal.create({ data });
    await audit({
      userId: viewer.user.id,
      action: "goal.create",
      entity: "FarmGoal",
      entityId: goal.id,
      summary: `Criou meta semanal: ${data.quantity}× ${item.name}${rank ? ` (${rank.name})` : ""}`,
    });
    revalidate();
    return "Meta criada";
  });
}

export async function updateGoalQuantity(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const quantity = z.coerce.number().int().min(1, "Meta deve ser maior que zero").parse(fd.get("quantity"));
    const goal = await db.farmGoal.update({ where: { id }, data: { quantity }, include: { item: true } });
    await audit({ userId: viewer.user.id, action: "goal.update", entity: "FarmGoal", entityId: id, summary: `Meta de ${goal.item.name} agora é ${quantity}` });
    revalidate();
    return "Meta atualizada";
  });
}

export async function deleteGoal(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const goal = await db.farmGoal.delete({ where: { id }, include: { item: true } });
    await audit({ userId: viewer.user.id, action: "goal.delete", entity: "FarmGoal", entityId: id, summary: `Removeu a meta de ${goal.item.name}` });
    revalidate();
    return "Meta removida";
  });
}
