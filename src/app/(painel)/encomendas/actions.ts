"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { canMoveOrder, money, orderTotal } from "@/lib/finance";
import { assertCanTake } from "@/lib/vault";
import { ORDER_STATUS } from "@/lib/labels";
import { parseOrderForm } from "@/lib/schemas/finance";

function revalidate() {
  revalidatePath("/encomendas");
  revalidatePath("/bau");
  revalidatePath("/dashboard");
}

async function parse(fd: FormData) {
  const data = parseOrderForm(fd);
  if (!(await db.item.findUnique({ where: { id: data.itemId } }))) throw new Error("Item inválido");
  if (data.factionId && !(await db.faction.findUnique({ where: { id: data.factionId } }))) throw new Error("Facção inválida");
  if (data.assignedToId && !(await db.member.findUnique({ where: { id: data.assignedToId } }))) throw new Error("Membro inválido");
  return data;
}

export async function createOrder(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("encomendas.gerenciar");
    const data = await parse(fd);
    const order = await db.order.create({ data: { ...data, createdById: viewer.member?.id }, include: { item: true } });
    await audit({
      userId: viewer.user.id,
      action: "order.create",
      entity: "Order",
      entityId: order.id,
      summary: `Nova encomenda de ${order.customer}: ${order.quantity}× ${order.item.name} (${money(orderTotal(order))})`,
    });
    revalidate();
    return "Encomenda criada";
  });
}

export async function updateOrder(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("encomendas.gerenciar");
    const current = await db.order.findUniqueOrThrow({ where: { id } });
    if (current.status === "ENTREGUE") throw new Error("Encomenda já entregue não pode ser editada");
    const order = await db.order.update({ where: { id }, data: await parse(fd) });
    await audit({ userId: viewer.user.id, action: "order.update", entity: "Order", entityId: id, summary: `Editou a encomenda de ${order.customer}` });
    revalidate();
    return "Encomenda atualizada";
  });
}

const statusSchema = z.enum(["ABERTA", "PRODUCAO", "PRONTA", "CANCELADA"]);

/** Muda o status (a entrega tem ação própria). */
export async function moveOrder(id: string, to: string) {
  return runAction(async () => {
    const viewer = await assertPermission("encomendas.gerenciar");
    const next = statusSchema.parse(to);
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    if (!canMoveOrder(order.status, next)) throw new Error(`Não dá para ir de "${ORDER_STATUS[order.status].label}" para "${ORDER_STATUS[next].label}"`);
    await db.order.update({ where: { id }, data: { status: next } });
    await audit({ userId: viewer.user.id, action: "order.status", entity: "Order", entityId: id, summary: `Encomenda de ${order.customer}: ${ORDER_STATUS[next].label}` });
    revalidate();
    return `Encomenda: ${ORDER_STATUS[next].label.toLowerCase()}`;
  });
}

/** Entrega: opcionalmente tira o item do baú e lança o pagamento. */
export async function deliverOrder(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("encomendas.gerenciar");
    const takeFromVault = fd.get("takeFromVault") === "on";
    const payment = z.enum(["NAO", "DINHEIRO_SUJO", "DINHEIRO_LIMPO"]).parse(fd.get("payment") ?? "NAO");

    const order = await db.$transaction(async (tx) => {
      const o = await tx.order.findUniqueOrThrow({ where: { id }, include: { item: true } });
      if (!canMoveOrder(o.status, "ENTREGUE")) throw new Error("Só encomendas prontas podem ser entregues");
      const by = viewer.member?.id;
      const now = new Date();
      if (takeFromVault) {
        await assertCanTake(tx, "ITEM", o.itemId, o.quantity, o.item.name);
        await tx.vaultTransaction.create({
          data: { kind: "SAIDA", asset: "ITEM", itemId: o.itemId, quantity: o.quantity, reason: `Encomenda de ${o.customer}`, orderId: o.id, createdById: by, confirmedById: by, confirmedAt: now },
        });
      }
      const total = orderTotal(o);
      if (payment !== "NAO" && total > 0) {
        await tx.vaultTransaction.create({
          data: { kind: "ENTRADA", asset: payment, quantity: total, reason: `Pagamento da encomenda de ${o.customer}`, orderId: o.id, createdById: by, confirmedById: by, confirmedAt: now },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: "ENTREGUE", deliveredAt: now, paid: o.paid || payment !== "NAO" },
        include: { item: true },
      });
    });
    await audit({
      userId: viewer.user.id,
      action: "order.deliver",
      entity: "Order",
      entityId: id,
      summary: `Entregou ${order.quantity}× ${order.item.name} para ${order.customer}${payment !== "NAO" ? ` (${money(orderTotal(order))} no baú)` : ""}`,
    });
    revalidate();
    return "Encomenda entregue";
  });
}

export async function deleteOrder(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("encomendas.gerenciar");
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    if (order.status === "ENTREGUE") throw new Error("Encomenda entregue fica no histórico (estorne no baú se precisar)");
    await db.order.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "order.delete", entity: "Order", entityId: id, summary: `Apagou a encomenda de ${order.customer}` });
    revalidate();
    return "Encomenda apagada";
  });
}
