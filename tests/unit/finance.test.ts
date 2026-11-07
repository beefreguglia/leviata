import { describe, expect, it } from "vitest";
import { canMoveOrder, goalProgress, money, orderTotal, vaultBalance, weekRangeBRT } from "@/lib/finance";
import { parseDeliveryForm, parseGoalForm, parseOrderForm, parsePunishmentForm, parseVaultMoveForm } from "@/lib/schemas/finance";

const fd = (data: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) f.append(k, v);
  return f;
};

describe("saldo do baú", () => {
  it("soma entradas, subtrai saídas e ignora pendentes/estornadas", () => {
    const b = vaultBalance([
      { kind: "ENTRADA", asset: "DINHEIRO_SUJO", itemId: null, quantity: 100_000, status: "CONFIRMADA" },
      { kind: "SAIDA", asset: "DINHEIRO_SUJO", itemId: null, quantity: 30_000, status: "CONFIRMADA" },
      { kind: "ENTRADA", asset: "DINHEIRO_LIMPO", itemId: null, quantity: 5_000, status: "CONFIRMADA" },
      { kind: "ENTRADA", asset: "ITEM", itemId: "metal", quantity: 50, status: "CONFIRMADA" },
      { kind: "SAIDA", asset: "ITEM", itemId: "metal", quantity: 8, status: "CONFIRMADA" },
      { kind: "ENTRADA", asset: "ITEM", itemId: "metal", quantity: 999, status: "PENDENTE" },
      { kind: "ENTRADA", asset: "DINHEIRO_SUJO", itemId: null, quantity: 999, status: "ESTORNADA" },
    ]);
    expect(b.dirty).toBe(70_000);
    expect(b.clean).toBe(5_000);
    expect(b.items.get("metal")).toBe(42);
  });
  it("formata dinheiro", () => {
    expect(money(1234567)).toBe("R$ 1.234.567");
  });
});

describe("semana de farm (segunda a domingo, Brasília)", () => {
  it("sexta 6/nov/2026 → semana de seg 2/nov a seg 9/nov", () => {
    const w = weekRangeBRT(new Date("2026-11-06T15:00:00Z"));
    expect(w.from.toISOString()).toBe("2026-11-02T03:00:00.000Z");
    expect(w.to.toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
  it("domingo 23h de Brasília ainda é a semana anterior", () => {
    const w = weekRangeBRT(new Date("2026-11-09T02:00:00Z")); // dom 08/11 23h BRT
    expect(w.from.toISOString()).toBe("2026-11-02T03:00:00.000Z");
  });
  it("segunda 00h de Brasília começa a nova semana", () => {
    const w = weekRangeBRT(new Date("2026-11-09T03:00:00Z"));
    expect(w.from.toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
});

describe("metas e encomendas", () => {
  it("progresso da meta", () => {
    expect(goalProgress(150, 200)).toEqual({ done: 150, target: 200, pct: 75, missing: 50, complete: false });
    expect(goalProgress(250, 200)).toMatchObject({ pct: 100, missing: 0, complete: true });
  });
  it("fluxo de status da encomenda", () => {
    expect(canMoveOrder("ABERTA", "PRODUCAO")).toBe(true);
    expect(canMoveOrder("PRONTA", "ENTREGUE")).toBe(true);
    expect(canMoveOrder("ABERTA", "ENTREGUE")).toBe(false);
    expect(canMoveOrder("ENTREGUE", "ABERTA")).toBe(false);
    expect(orderTotal({ quantity: 10, unitPrice: 2500 })).toBe(25000);
  });
});

describe("validações da Fase 4", () => {
  it("movimentação: item exige item; quantidade inteira positiva", () => {
    expect(parseVaultMoveForm(fd({ kind: "SAIDA", asset: "DINHEIRO_SUJO", quantity: "5000", itemId: "ignorado" }))).toMatchObject({ itemId: null, quantity: 5000 });
    expect(() => parseVaultMoveForm(fd({ kind: "ENTRADA", asset: "ITEM", quantity: "5" }))).toThrow("Escolha o item");
    expect(() => parseVaultMoveForm(fd({ kind: "ENTRADA", asset: "ITEM", itemId: "x", quantity: "0" }))).toThrow("maior que zero");
    expect(() => parseVaultMoveForm(fd({ kind: "ENTRADA", asset: "ITEM", itemId: "x", quantity: "2.5" }))).toThrow("inteiro");
  });
  it("entrega e meta", () => {
    expect(parseDeliveryForm(fd({ itemId: "metal", quantity: "40" }))).toMatchObject({ itemId: "metal", quantity: 40 });
    expect(parseGoalForm(fd({ itemId: "metal", quantity: "200", rankId: "" }))).toEqual({ itemId: "metal", quantity: 200, rankId: null });
  });
  it("encomenda com prazo no fim do dia", () => {
    const o = parseOrderForm(fd({ customer: "Família Leone", itemId: "pistola", quantity: "5", unitPrice: "12000", dueAt: "2026-11-10", paid: "on" }));
    expect(o).toMatchObject({ customer: "Família Leone", quantity: 5, unitPrice: 12000, paid: true });
    expect(o.dueAt?.toISOString()).toBe("2026-11-11T02:59:59.999Z");
    expect(() => parseOrderForm(fd({ customer: "X", itemId: "p", quantity: "1" }))).toThrow("Informe o cliente");
  });
  it("punição: regras por tipo", () => {
    expect(parsePunishmentForm(fd({ memberId: "m1", kind: "ADVERTENCIA", reason: "Faltou a ação" }))).toMatchObject({ fineAmount: null, days: null });
    expect(() => parsePunishmentForm(fd({ memberId: "m1", kind: "MULTA", reason: "Faltou a ação" }))).toThrow("valor da multa");
    expect(() => parsePunishmentForm(fd({ memberId: "m1", kind: "SUSPENSAO", reason: "Faltou a ação" }))).toThrow("dias de suspensão");
    expect(() => parsePunishmentForm(fd({ memberId: "m1", kind: "REBAIXAMENTO", reason: "Faltou a ação" }))).toThrow("nova patente");
    expect(() => parsePunishmentForm(fd({ memberId: "m1", kind: "ADVERTENCIA", reason: "x" }))).toThrow("motivo");
  });
});
