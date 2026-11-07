"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { money } from "@/lib/finance";
import { assertCanTake } from "@/lib/vault";
import { VAULT_ASSET } from "@/lib/labels";
import { parseDeliveryForm, parseVaultMoveForm } from "@/lib/schemas/finance";

function revalidate() {
  revalidatePath("/bau");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

async function describe(asset: keyof typeof VAULT_ASSET, itemId: string | null, quantity: number) {
  if (asset !== "ITEM") return `${money(quantity)} (${VAULT_ASSET[asset].short.toLowerCase()})`;
  const item = itemId ? await db.item.findUnique({ where: { id: itemId } }) : null;
  return `${quantity.toLocaleString("pt-BR")} ${item?.unit ?? "un"} de ${item?.name ?? "item"}`;
}

/** Gerência registra entrada ou saída (já confirmada). */
export async function registerMove(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const data = parseVaultMoveForm(fd);
    const item = data.itemId ? await db.item.findUnique({ where: { id: data.itemId } }) : null;
    if (data.itemId && !item) throw new Error("Item inválido");
    if (data.memberId && !(await db.member.findUnique({ where: { id: data.memberId } }))) throw new Error("Membro inválido");
    const label = await describe(data.asset, data.itemId, data.quantity);
    const what = item ? item.name : VAULT_ASSET[data.asset].label.toLowerCase();

    const move = await db.$transaction(async (tx) => {
      if (data.kind === "SAIDA") await assertCanTake(tx, data.asset, data.itemId, data.quantity, what);
      return tx.vaultTransaction.create({
        data: { ...data, status: "CONFIRMADA", createdById: viewer.member?.id, confirmedById: viewer.member?.id, confirmedAt: new Date() },
      });
    });
    await audit({
      userId: viewer.user.id,
      action: "vault.move",
      entity: "VaultTransaction",
      entityId: move.id,
      summary: `${data.kind === "ENTRADA" ? "Entrada" : "Saída"} no baú: ${label}${data.reason ? ` — ${data.reason}` : ""}`,
    });
    revalidate();
    return data.kind === "ENTRADA" ? "Entrada registrada" : "Saída registrada";
  });
}

/** Membro entrega farm no baú (fica pendente até a gerência conferir). */
export async function deliverFarm(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("economia.ver");
    if (!viewer.member) throw new Error("Você não tem ficha de membro");
    const data = parseDeliveryForm(fd);
    if (!(await db.item.findUnique({ where: { id: data.itemId } }))) throw new Error("Item inválido");
    const auto = viewer.can("financeiro.gerenciar");
    const move = await db.vaultTransaction.create({
      data: {
        kind: "ENTRADA",
        asset: "ITEM",
        itemId: data.itemId,
        quantity: data.quantity,
        reason: data.reason ?? "Entrega de farm",
        memberId: viewer.member.id,
        createdById: viewer.member.id,
        status: auto ? "CONFIRMADA" : "PENDENTE",
        confirmedById: auto ? viewer.member.id : null,
        confirmedAt: auto ? new Date() : null,
      },
    });
    await audit({
      userId: viewer.user.id,
      action: "vault.deliver",
      entity: "VaultTransaction",
      entityId: move.id,
      summary: `${viewer.member.rpName} entregou ${await describe("ITEM", data.itemId, data.quantity)}`,
    });
    revalidate();
    return auto ? "Entrega registrada" : "Entrega enviada — a gerência confere e ela entra na sua meta";
  });
}

export async function confirmMove(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const move = await db.vaultTransaction.findUniqueOrThrow({ where: { id }, include: { member: true } });
    if (move.status !== "PENDENTE") throw new Error("Essa movimentação já foi conferida");
    await db.vaultTransaction.update({ where: { id }, data: { status: "CONFIRMADA", confirmedById: viewer.member?.id, confirmedAt: new Date() } });
    await audit({
      userId: viewer.user.id,
      action: "vault.confirm",
      entity: "VaultTransaction",
      entityId: id,
      summary: `Conferiu a entrega de ${move.member?.rpName ?? "—"}: ${await describe(move.asset, move.itemId, move.quantity)}`,
    });
    revalidate();
    return "Entrega conferida";
  });
}

/** Estorna (anula) uma movimentação. Estornar uma ENTRADA não pode deixar o saldo negativo. */
export async function reverseMove(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("financeiro.gerenciar");
    const move = await db.$transaction(async (tx) => {
      const m = await tx.vaultTransaction.findUniqueOrThrow({ where: { id } });
      if (m.status === "ESTORNADA") throw new Error("Já estava estornada");
      if (m.status === "CONFIRMADA" && m.kind === "ENTRADA") {
        await assertCanTake(tx, m.asset, m.itemId, m.quantity, "estoque para estornar");
      }
      await tx.vaultTransaction.update({ where: { id }, data: { status: "ESTORNADA" } });
      return m;
    });
    // auditoria fora da transação (depois do commit)
    await audit({
      userId: viewer.user.id,
      action: "vault.reverse",
      entity: "VaultTransaction",
      entityId: id,
      summary: `Estornou: ${await describe(move.asset, move.itemId, move.quantity)}`,
    });
    revalidate();
    return "Movimentação estornada";
  });
}

/** Membro cancela a própria entrega ainda pendente. */
export async function cancelMyDelivery(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("economia.ver");
    const move = await db.vaultTransaction.findUniqueOrThrow({ where: { id } });
    if (move.memberId !== viewer.member?.id || move.createdById !== viewer.member?.id) throw new Error("Sem permissão");
    if (move.status !== "PENDENTE") throw new Error("Só dá para cancelar entregas ainda não conferidas");
    await db.vaultTransaction.update({ where: { id }, data: { status: "ESTORNADA" } });
    revalidate();
    return "Entrega cancelada";
  });
}
