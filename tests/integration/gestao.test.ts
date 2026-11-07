import { describe, expect, it } from "vitest";
import { cancelMyDelivery, confirmMove, deliverFarm, registerMove, reverseMove } from "@/app/(painel)/bau/actions";
import { createGoal, deleteGoal, updateGoalQuantity } from "@/app/(painel)/metas/actions";
import { createOrder, deleteOrder, deliverOrder, moveOrder } from "@/app/(painel)/encomendas/actions";
import { completePunishment, createPunishment, revokePunishment } from "@/app/(painel)/punicoes/actions";
import { saveLineup } from "@/app/(painel)/agenda/actions";
import { allBalances } from "@/lib/vault";
import { weeklyGoals } from "@/lib/goals";
import { getViewer } from "@/lib/session";
import { actAs, db, form, memberByName, rankId } from "../helpers/db";

async function metal() {
  return db.item.upsert({ where: { name: "Metal" }, create: { name: "Metal" }, update: {} });
}

describe("baú", () => {
  it("gerência registra entradas e saídas; saldo confere", async () => {
    await actAs("dev-gerente");
    expect(await registerMove(form({ kind: "ENTRADA", asset: "DINHEIRO_SUJO", quantity: "100000", reason: "Loot" }))).toEqual({ ok: true, message: "Entrada registrada" });
    expect((await registerMove(form({ kind: "SAIDA", asset: "DINHEIRO_SUJO", quantity: "30000" }))).ok).toBe(true);
    const b = await allBalances();
    expect(b.dirty).toBe(70000);
    expect(b.clean).toBe(0);
  });

  it("não deixa sair mais do que tem", async () => {
    const m = await metal();
    await actAs("dev-gerente");
    await registerMove(form({ kind: "ENTRADA", asset: "ITEM", itemId: m.id, quantity: "10" }));
    expect(await registerMove(form({ kind: "SAIDA", asset: "ITEM", itemId: m.id, quantity: "11" }))).toEqual({
      ok: false,
      error: "Saldo insuficiente de Metal: tem 10, precisa de 11",
    });
    expect(await registerMove(form({ kind: "SAIDA", asset: "DINHEIRO_LIMPO", quantity: "1" }))).toEqual({
      ok: false,
      error: "Saldo insuficiente de dinheiro limpo: tem 0, precisa de 1",
    });
  });

  it("soldado entrega farm → pendente (não conta) → gerência confere (conta)", async () => {
    const m = await metal();
    await actAs("dev-soldado");
    expect(await deliverFarm(form({ itemId: m.id, quantity: "40" }))).toEqual({ ok: true, message: "Entrega enviada — a gerência confere e ela entra na sua meta" });
    expect((await allBalances()).items.get(m.id)).toBeUndefined();
    const move = await db.vaultTransaction.findFirstOrThrow();
    expect(move).toMatchObject({ status: "PENDENTE", kind: "ENTRADA" });

    expect((await confirmMove(move.id)).ok).toBe(false); // soldado não confere
    await actAs("dev-gerente");
    expect(await confirmMove(move.id)).toEqual({ ok: true, message: "Entrega conferida" });
    expect((await allBalances()).items.get(m.id)).toBe(40);
    expect(await confirmMove(move.id)).toEqual({ ok: false, error: "Essa movimentação já foi conferida" });
  });

  it("gerente que entrega já entra confirmado", async () => {
    const m = await metal();
    await actAs("dev-gerente");
    await deliverFarm(form({ itemId: m.id, quantity: "5" }));
    expect((await db.vaultTransaction.findFirstOrThrow()).status).toBe("CONFIRMADA");
  });

  it("estornar entrada não pode deixar o saldo negativo", async () => {
    const m = await metal();
    await actAs("dev-gerente");
    await registerMove(form({ kind: "ENTRADA", asset: "ITEM", itemId: m.id, quantity: "10" }));
    await registerMove(form({ kind: "SAIDA", asset: "ITEM", itemId: m.id, quantity: "8" }));
    const entrada = await db.vaultTransaction.findFirstOrThrow({ where: { kind: "ENTRADA" } });
    expect((await reverseMove(entrada.id)).ok).toBe(false);
    const saida = await db.vaultTransaction.findFirstOrThrow({ where: { kind: "SAIDA" } });
    expect(await reverseMove(saida.id)).toEqual({ ok: true, message: "Movimentação estornada" });
    expect(await reverseMove(entrada.id)).toEqual({ ok: true, message: "Movimentação estornada" });
    expect((await allBalances()).items.get(m.id) ?? 0).toBe(0);
  });

  it("membro cancela só a própria entrega pendente", async () => {
    const m = await metal();
    await actAs("dev-soldado");
    await deliverFarm(form({ itemId: m.id, quantity: "3" }));
    const move = await db.vaultTransaction.findFirstOrThrow();
    await actAs("dev-recruta");
    expect((await cancelMyDelivery(move.id)).ok).toBe(false);
    await actAs("dev-soldado");
    expect(await cancelMyDelivery(move.id)).toEqual({ ok: true, message: "Entrega cancelada" });
    expect((await db.vaultTransaction.findFirstOrThrow()).status).toBe("ESTORNADA");
  });
});

describe("metas de farm", () => {
  it("progresso da semana conta só entregas conferidas; meta da patente vence a geral", async () => {
    const m = await metal();
    await actAs("dev-gerente");
    expect(await createGoal(form({ itemId: m.id, quantity: "100" }))).toEqual({ ok: true, message: "Meta criada" });
    expect((await createGoal(form({ itemId: m.id, quantity: "50" }))).ok).toBe(false); // duplicada
    expect((await createGoal(form({ itemId: m.id, quantity: "30", rankId: await rankId("Soldado") }))).ok).toBe(true);

    await actAs("dev-soldado");
    await deliverFarm(form({ itemId: m.id, quantity: "20" }));
    let g = await weeklyGoals();
    const nina = () => g.rows.find((r) => r.member.rpName === "Nina Torres")!;
    expect(nina().cells[0]).toMatchObject({ applicable: true, done: 0, target: 30 }); // pendente não conta

    await actAs("dev-gerente");
    await confirmMove((await db.vaultTransaction.findFirstOrThrow()).id);
    g = await weeklyGoals();
    expect(nina().cells[0]).toMatchObject({ done: 20, target: 30, missing: 10, complete: false });
    expect(g.rows.find((r) => r.member.rpName === "Dante Moretti")!.cells[0]).toMatchObject({ target: 100 });

    const goal = await db.farmGoal.findFirstOrThrow({ where: { rankId: { not: null } } });
    await updateGoalQuantity(goal.id, form({ quantity: "20" }));
    g = await weeklyGoals();
    expect(nina().complete).toBe(true);
    expect((await deleteGoal(goal.id)).ok).toBe(true);
  });

  it("entrega de semana passada não conta", async () => {
    const m = await metal();
    const nina = await memberByName("Nina Torres");
    await db.farmGoal.create({ data: { itemId: m.id, quantity: 10 } });
    await db.vaultTransaction.create({
      data: { kind: "ENTRADA", asset: "ITEM", itemId: m.id, quantity: 50, memberId: nina.id, status: "CONFIRMADA", createdAt: new Date(Date.now() - 10 * 86400_000) },
    });
    const g = await weeklyGoals();
    expect(g.rows.find((r) => r.member.id === nina.id)!.cells[0]).toMatchObject({ done: 0 });
  });
});

describe("encomendas", () => {
  async function order(extra: Record<string, string> = {}) {
    const m = await metal();
    await actAs("dev-gerente");
    await createOrder(form({ customer: "Marco Leone", itemId: m.id, quantity: "5", unitPrice: "1000", ...extra }));
    return { order: await db.order.findFirstOrThrow({ orderBy: { createdAt: "desc" } }), item: m };
  }

  it("segue o fluxo e não pula etapas", async () => {
    const { order: o } = await order();
    expect(await moveOrder(o.id, "PRONTA")).toEqual({ ok: false, error: 'Não dá para ir de "Aberta" para "Pronta"' });
    expect((await moveOrder(o.id, "PRODUCAO")).ok).toBe(true);
    expect((await moveOrder(o.id, "PRONTA")).ok).toBe(true);
    expect((await moveOrder(o.id, "ENTREGUE")).ok).toBe(false); // entrega tem ação própria
  });

  it("entrega tira do baú e lança o pagamento (tudo ou nada)", async () => {
    const { order: o, item } = await order();
    await moveOrder(o.id, "PRODUCAO");
    await moveOrder(o.id, "PRONTA");
    // sem estoque: falha e nada muda
    expect(await deliverOrder(o.id, form({ takeFromVault: "on", payment: "DINHEIRO_SUJO" }))).toEqual({
      ok: false,
      error: "Saldo insuficiente de Metal: tem 0, precisa de 5",
    });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PRONTA");
    expect(await db.vaultTransaction.count()).toBe(0);

    await registerMove(form({ kind: "ENTRADA", asset: "ITEM", itemId: item.id, quantity: "7" }));
    expect(await deliverOrder(o.id, form({ takeFromVault: "on", payment: "DINHEIRO_SUJO" }))).toEqual({ ok: true, message: "Encomenda entregue" });
    const b = await allBalances();
    expect(b.items.get(item.id)).toBe(2);
    expect(b.dirty).toBe(5000);
    expect(await db.order.findUniqueOrThrow({ where: { id: o.id } })).toMatchObject({ status: "ENTREGUE", paid: true });
    expect((await deleteOrder(o.id)).ok).toBe(false);
  });

  it("soldado não mexe em encomendas", async () => {
    const { order: o } = await order();
    await actAs("dev-soldado");
    expect((await moveOrder(o.id, "PRODUCAO")).ok).toBe(false);
  });
});

describe("punições", () => {
  it("gerente adverte soldado; ao chegar em 3 o aviso muda", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    expect(await createPunishment(form({ memberId: nina.id, kind: "ADVERTENCIA", reason: "Faltou à ação" }))).toEqual({ ok: true, message: "Punição aplicada" });
    await createPunishment(form({ memberId: nina.id, kind: "ADVERTENCIA", reason: "Faltou à reunião" }));
    const third = await createPunishment(form({ memberId: nina.id, kind: "ADVERTENCIA", reason: "Não bateu meta" }));
    expect(third).toEqual({ ok: true, message: "Advertência aplicada — Nina Torres chegou a 3 advertências ativas" });
    const adv = await db.punishment.findFirstOrThrow();
    expect(adv.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);
  });

  it("hierarquia: não pune igual/acima nem a si mesmo (admin pode)", async () => {
    await actAs("dev-gerente");
    const dante = await memberByName("Dante Moretti");
    const rafa = await memberByName("Rafa Cardoso");
    expect(await createPunishment(form({ memberId: dante.id, kind: "ADVERTENCIA", reason: "Tentativa" }))).toEqual({
      ok: false,
      error: "Você só pode punir membros de patente abaixo da sua",
    });
    expect(await createPunishment(form({ memberId: rafa.id, kind: "ADVERTENCIA", reason: "Tentativa" }))).toEqual({
      ok: false,
      error: "Você não pode punir a si mesmo",
    });
    await actAs("dev-lider");
    expect((await createPunishment(form({ memberId: rafa.id, kind: "ADVERTENCIA", reason: "Atrasou o baú" }))).ok).toBe(true);
  });

  it("rebaixamento troca a patente e registra no histórico", async () => {
    await actAs("dev-lider");
    const rafa = await memberByName("Rafa Cardoso");
    expect((await createPunishment(form({ memberId: rafa.id, kind: "REBAIXAMENTO", reason: "Sumiu do baú", toRankId: await rankId("Soldado") }))).ok).toBe(true);
    expect((await memberByName("Rafa Cardoso")).rank?.name).toBe("Soldado");
    const promo = await db.promotion.findFirstOrThrow({ where: { memberId: rafa.id } });
    expect(promo.reason).toBe("Punição: Sumiu do baú");
    // "rebaixar" para cima é recusado
    const leo = await memberByName("Léo Vieira");
    expect(await createPunishment(form({ memberId: leo.id, kind: "REBAIXAMENTO", reason: "Teste ruim", toRankId: await rankId("Gerente") }))).toEqual({
      ok: false,
      error: "Rebaixamento precisa ser para uma patente abaixo da atual",
    });
    expect(await db.punishment.count({ where: { memberId: leo.id } })).toBe(0); // transação desfeita
  });

  it("expulsão tira o acesso; revogar devolve", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    await createPunishment(form({ memberId: nina.id, kind: "EXPULSAO", reason: "Traição confirmada" }));
    await actAs("dev-soldado");
    expect((await getViewer())?.permissions).toEqual([]);

    await actAs("dev-gerente");
    const p = await db.punishment.findFirstOrThrow();
    expect((await revokePunishment(p.id, form({ revokeReason: "ab" }))).ok).toBe(false);
    expect(await revokePunishment(p.id, form({ revokeReason: "Era armação dos Ballas" }))).toEqual({ ok: true, message: "Nina Torres voltou para a fac" });
    expect((await memberByName("Nina Torres")).status).toBe("ATIVO");
  });

  it("suspensão bloqueia na escalação; multa pode ser marcada como paga", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    await createPunishment(form({ memberId: nina.id, kind: "SUSPENSAO", reason: "Briga na base", days: "5" }));
    const ev = await db.event.create({ data: { title: "Ação", startsAt: new Date(Date.now() + 86400_000) } });
    expect(await saveLineup(ev.id, form({ slotRole: ["Piloto"], slotMember: [nina.id], slotVehicle: [""], slotNotes: [""] }))).toEqual({
      ok: false,
      error: "Nina Torres está suspenso nesse horário",
    });

    await createPunishment(form({ memberId: nina.id, kind: "MULTA", reason: "Bateu o carro da fac", fineAmount: "20000" }));
    const multa = await db.punishment.findFirstOrThrow({ where: { kind: "MULTA" } });
    expect(await completePunishment(multa.id)).toEqual({ ok: true, message: "Marcada como cumprida" });
  });

  it("soldado não aplica punição", async () => {
    await actAs("dev-soldado");
    const leo = await memberByName("Léo Vieira");
    expect((await createPunishment(form({ memberId: leo.id, kind: "ADVERTENCIA", reason: "Tentativa" }))).ok).toBe(false);
  });
});
