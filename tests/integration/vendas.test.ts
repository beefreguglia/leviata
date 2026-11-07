import { describe, expect, it } from "vitest";
import { cancelSale, createSale } from "@/app/(painel)/vendas/actions";
import { registerMove } from "@/app/(painel)/bau/actions";
import { allBalances } from "@/lib/vault";
import { actAs, db, form, memberByName } from "../helpers/db";

async function stock(qty: number) {
  const item = await db.item.create({ data: { name: "Pistola" } });
  await actAs("dev-gerente");
  await registerMove(form({ kind: "ENTRADA", asset: "ITEM", itemId: item.id, quantity: String(qty), reason: "Produção" }));
  return item;
}

describe("vendas", () => {
  it("venda para player: tira do baú e o dinheiro entra (tudo junto)", async () => {
    const item = await stock(10);
    const rafa = await memberByName("Rafa Cardoso");
    expect(
      await createSale(form({ buyerKind: "PLAYER", buyerName: "João Silva", buyerPassport: "5555", itemId: item.id, quantity: "4", unitPrice: "2500", payment: "DINHEIRO_SUJO", fromVault: "on" })),
    ).toEqual({ ok: true, message: "Venda registrada: R$ 10.000 no baú" });
    const b = await allBalances();
    expect(b.items.get(item.id)).toBe(6);
    expect(b.dirty).toBe(10_000);
    const sale = await db.sale.findFirstOrThrow();
    expect(sale).toMatchObject({ buyerKind: "PLAYER", buyerName: "João Silva", buyerPassport: "5555", sellerId: rafa.id, cancelledAt: null });
    expect(await db.vaultTransaction.count({ where: { saleId: sale.id } })).toBe(2);
    expect(await db.auditLog.findFirst({ where: { action: "sale.create" } })).toBeTruthy();
  });

  it("venda para facção usa o nome da facção; sem estoque não vende nada", async () => {
    const item = await stock(2);
    const ballas = await db.faction.create({ data: { name: "Ballas" } });
    expect(await createSale(form({ buyerKind: "FACCAO", factionId: ballas.id, itemId: item.id, quantity: "5", unitPrice: "100", payment: "DINHEIRO_LIMPO", fromVault: "on" }))).toEqual({
      ok: false,
      error: "Saldo insuficiente de Pistola: tem 2, precisa de 5",
    });
    expect(await db.sale.count()).toBe(0);
    expect((await createSale(form({ buyerKind: "FACCAO", factionId: ballas.id, itemId: item.id, quantity: "2", unitPrice: "100", payment: "DINHEIRO_LIMPO", fromVault: "on" }))).ok).toBe(true);
    expect(await db.sale.findFirstOrThrow()).toMatchObject({ buyerKind: "FACCAO", buyerName: "Ballas", factionId: ballas.id });
    expect((await allBalances()).clean).toBe(200);
  });

  it("sem tirar do baú: só o dinheiro entra", async () => {
    const item = await stock(1);
    await createSale(form({ buyerKind: "PLAYER", buyerName: "Zé", itemId: item.id, quantity: "50", unitPrice: "10", payment: "DINHEIRO_SUJO" }));
    const b = await allBalances();
    expect(b.items.get(item.id)).toBe(1);
    expect(b.dirty).toBe(500);
  });

  it("validações", async () => {
    const item = await stock(5);
    expect(await createSale(form({ buyerKind: "FACCAO", itemId: item.id, quantity: "1", unitPrice: "1", payment: "DINHEIRO_SUJO" }))).toMatchObject({ ok: false, error: "Escolha a facção" });
    expect(await createSale(form({ buyerKind: "PLAYER", buyerName: "", itemId: item.id, quantity: "1", unitPrice: "1", payment: "DINHEIRO_SUJO" }))).toMatchObject({ ok: false, error: "Informe o nome do player" });
    expect(await createSale(form({ buyerKind: "PLAYER", buyerName: "Zé", buyerPassport: "abc", itemId: item.id, quantity: "1", unitPrice: "1", payment: "DINHEIRO_SUJO" }))).toMatchObject({ ok: false, error: "ID do player inválido — só números" });
    expect(await createSale(form({ buyerKind: "FACCAO", factionId: "falsa", itemId: item.id, quantity: "1", unitPrice: "1", payment: "DINHEIRO_SUJO" }))).toEqual({ ok: false, error: "Facção inválida" });
  });

  it("cancelar desfaz no baú; não cancela duas vezes; precisa ter o dinheiro", async () => {
    const item = await stock(10);
    await createSale(form({ buyerKind: "PLAYER", buyerName: "João", itemId: item.id, quantity: "4", unitPrice: "100", payment: "DINHEIRO_SUJO", fromVault: "on" }));
    const sale = await db.sale.findFirstOrThrow();

    // gastou o dinheiro da venda → não dá para estornar
    await registerMove(form({ kind: "SAIDA", asset: "DINHEIRO_SUJO", quantity: "400", reason: "Compra" }));
    expect(await cancelSale(sale.id, form({}))).toEqual({ ok: false, error: "Saldo insuficiente de dinheiro sujo: tem 0, precisa de 400" });
    await registerMove(form({ kind: "ENTRADA", asset: "DINHEIRO_SUJO", quantity: "400", reason: "Volta" }));

    expect(await cancelSale(sale.id, form({ reason: "lançado errado" }))).toEqual({ ok: true, message: "Venda cancelada e desfeita no baú" });
    const b = await allBalances();
    expect(b.items.get(item.id)).toBe(10);
    expect(b.dirty).toBe(0);
    expect(await db.sale.findFirstOrThrow()).toMatchObject({ cancelReason: "lançado errado" });
    expect(await cancelSale(sale.id, form({}))).toEqual({ ok: false, error: "Essa venda já foi cancelada" });
  });

  it("só quem gerencia o financeiro vende", async () => {
    const item = await stock(5);
    await actAs("dev-soldado");
    expect((await createSale(form({ buyerKind: "PLAYER", buyerName: "Zé", itemId: item.id, quantity: "1", unitPrice: "1", payment: "DINHEIRO_SUJO" }))).ok).toBe(false);
  });
});
