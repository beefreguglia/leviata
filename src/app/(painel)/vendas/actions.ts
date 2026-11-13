"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { assertCanTake } from "@/lib/vault";
import { money } from "@/lib/finance";
import { parseSaleForm } from "@/lib/schemas/finance";
import { optionalText } from "@/lib/schemas/content";

function revalidate() {
  revalidatePath("/vendas");
  revalidatePath("/bau");
  revalidatePath("/dashboard");
  revalidatePath("/faccoes", "layout");
}

/** Registra a venda: tira o item do baú (se marcado) e lança o pagamento, tudo ou nada. */
export async function createSale(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("vendas.gerenciar");
    const input = parseSaleForm(fd);
    const by = viewer.member?.id ?? null;

    const sale = await db.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: input.itemId } });
      if (!item) throw new Error("Item inválido");
      let buyerName = input.buyerName ?? "";
      if (input.buyerKind === "FACCAO") {
        const faction = await tx.faction.findUnique({ where: { id: input.factionId! } });
        if (!faction) throw new Error("Facção inválida");
        buyerName = faction.name;
      }
      if (input.sellerId && !(await tx.member.findUnique({ where: { id: input.sellerId } }))) throw new Error("Vendedor inválido");

      const created = await tx.sale.create({
        data: {
          buyerKind: input.buyerKind,
          buyerName,
          buyerPassport: input.buyerPassport,
          factionId: input.factionId,
          itemId: item.id,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          payment: input.payment,
          fromVault: input.fromVault,
          notes: input.notes,
          sellerId: input.sellerId ?? by,
          createdById: by,
        },
      });
      const now = new Date();
      const base = { saleId: created.id, createdById: by, confirmedById: by, confirmedAt: now, memberId: created.sellerId };
      if (input.fromVault) {
        await assertCanTake(tx, "ITEM", item.id, input.quantity, item.name);
        await tx.vaultTransaction.create({
          data: { ...base, kind: "SAIDA", asset: "ITEM", itemId: item.id, quantity: input.quantity, reason: `Venda para ${buyerName}` },
        });
      }
      const total = input.quantity * input.unitPrice;
      if (total > 0) {
        await tx.vaultTransaction.create({
          data: { ...base, kind: "ENTRADA", asset: input.payment, quantity: total, reason: `Venda de ${input.quantity}× ${item.name} para ${buyerName}` },
        });
      }
      return { ...created, itemName: item.name, total };
    });

    await audit({
      userId: viewer.user.id,
      action: "sale.create",
      entity: "Sale",
      entityId: sale.id,
      summary: `Vendeu ${sale.quantity}× ${sale.itemName} para ${sale.buyerName} (${sale.buyerKind === "FACCAO" ? "facção" : "player"}) por ${money(sale.total)}`,
    });
    revalidate();
    return `Venda registrada: ${money(sale.total)} no baú`;
  });
}

/** Cancela a venda e desfaz no baú: o item volta e o dinheiro sai (precisa ter saldo). */
export async function cancelSale(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("vendas.gerenciar");
    const reason = optionalText(300).parse(fd.get("reason") ?? "");
    const by = viewer.member?.id ?? null;

    const sale = await db.$transaction(async (tx) => {
      const s = await tx.sale.findUniqueOrThrow({ where: { id }, include: { item: true } });
      if (s.cancelledAt) throw new Error("Essa venda já foi cancelada");
      const now = new Date();
      const base = { saleId: s.id, createdById: by, confirmedById: by, confirmedAt: now, memberId: s.sellerId };
      const total = s.quantity * s.unitPrice;
      if (total > 0) {
        const label = s.payment === "DINHEIRO_SUJO" ? "dinheiro sujo" : "dinheiro limpo";
        await assertCanTake(tx, s.payment, null, total, label);
        await tx.vaultTransaction.create({
          data: { ...base, kind: "SAIDA", asset: s.payment, quantity: total, reason: `Estorno da venda para ${s.buyerName}` },
        });
      }
      if (s.fromVault) {
        await tx.vaultTransaction.create({
          data: { ...base, kind: "ENTRADA", asset: "ITEM", itemId: s.itemId, quantity: s.quantity, reason: `Estorno da venda para ${s.buyerName}` },
        });
      }
      return tx.sale.update({ where: { id }, data: { cancelledAt: now, cancelReason: reason }, include: { item: true } });
    });

    await audit({
      userId: viewer.user.id,
      action: "sale.cancel",
      entity: "Sale",
      entityId: id,
      summary: `Cancelou a venda de ${sale.quantity}× ${sale.item.name} para ${sale.buyerName}${reason ? ` — ${reason}` : ""}`,
    });
    revalidate();
    return "Venda cancelada e desfeita no baú";
  });
}
