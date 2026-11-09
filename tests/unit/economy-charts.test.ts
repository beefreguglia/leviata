import { describe, expect, it } from "vitest";
import { balanceSeries, lastWeeks, memberGoalPct, salesByWeek, topItems, weeklyCompletion, windowStart, type BalanceMove, type SaleRow } from "@/lib/economy-charts";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-11-11T15:00:00-03:00"); // quarta

const move = (createdAt: string, asset: BalanceMove["asset"], kind: BalanceMove["kind"], quantity: number): BalanceMove => ({ createdAt: at(createdAt), asset, kind, quantity });
const sale = (createdAt: string, buyerKind: SaleRow["buyerKind"], total: number, itemName = "Metal"): SaleRow => ({ createdAt: at(createdAt), buyerKind, quantity: 1, unitPrice: total, itemName });

describe("janelas no horário de Brasília", () => {
  it("janela de dias começa à meia-noite de Brasília", () => {
    expect(windowStart(NOW, 3).toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
  it("semanas vão de segunda a segunda e terminam na atual", () => {
    const weeks = lastWeeks(NOW, 2);
    expect(weeks.map((w) => w.label)).toEqual(["02/11", "09/11"]);
    expect(weeks[1].from.toISOString()).toBe("2026-11-09T03:00:00.000Z");
    expect(weeks[1].to.toISOString()).toBe("2026-11-16T03:00:00.000Z");
  });
});

describe("saldo por dia", () => {
  it("sem nada, volta vazio", () => {
    expect(balanceSeries({ dirty: 0, clean: 0 }, [], NOW, 30)).toEqual([]);
  });
  it("começa na véspera do primeiro movimento, sem história inventada", () => {
    const points = balanceSeries({ dirty: 0, clean: 0 }, [move("2026-11-10T12:00:00-03:00", "DINHEIRO_SUJO", "ENTRADA", 100)], NOW, 30);
    expect(points).toEqual([
      { label: "09/11", dirty: 0, clean: 0 },
      { label: "10/11", dirty: 100, clean: 0 },
      { label: "11/11", dirty: 100, clean: 0 },
    ]);
  });
  it("acumula sobre o saldo anterior e subtrai saídas", () => {
    const points = balanceSeries({ dirty: 50, clean: 10 }, [move("2026-11-10T12:00:00-03:00", "DINHEIRO_LIMPO", "SAIDA", 4)], NOW, 3);
    expect(points.map((p) => [p.label, p.dirty, p.clean])).toEqual([["09/11", 50, 10], ["10/11", 50, 6], ["11/11", 50, 6]]);
  });
  it("movimento às 22h de Brasília conta no dia certo, não no seguinte em UTC", () => {
    const points = balanceSeries({ dirty: 1, clean: 0 }, [move("2026-11-09T22:00:00-03:00", "DINHEIRO_SUJO", "ENTRADA", 9)], NOW, 3);
    expect(points[0]).toEqual({ label: "09/11", dirty: 10, clean: 0 });
  });
});

describe("vendas", () => {
  const weeks = lastWeeks(NOW, 3);
  it("separa facção e player e não inventa semanas antes da primeira venda", () => {
    const rows = salesByWeek([sale("2026-11-03T12:00:00-03:00", "FACCAO", 100), sale("2026-11-10T12:00:00-03:00", "PLAYER", 30), sale("2026-11-11T12:00:00-03:00", "FACCAO", 20)], weeks);
    expect(rows).toEqual([
      { label: "02/11", faccao: 100, player: 0 },
      { label: "09/11", faccao: 20, player: 30 },
    ]);
  });
  it("sem vendas, volta vazio", () => {
    expect(salesByWeek([], weeks)).toEqual([]);
  });
  it("ordena os itens por faturamento e respeita o limite", () => {
    const rows = topItems([sale("2026-11-10T12:00:00-03:00", "FACCAO", 10, "A"), sale("2026-11-10T12:00:00-03:00", "PLAYER", 30, "B"), sale("2026-11-10T12:00:00-03:00", "PLAYER", 5, "A")], 1);
    expect(rows).toEqual([{ name: "B", value: 30 }]);
  });
});

describe("metas", () => {
  it("usa a média em %, sem dispensados nem quem não tem meta", () => {
    const rows = memberGoalPct([
      { member: { rpName: "Ana" }, hasGoals: true, exempt: false, cells: [{ applicable: true, pct: 100 }, { applicable: true, pct: 50 }, { applicable: false }] },
      { member: { rpName: "Bia" }, hasGoals: true, exempt: false, cells: [{ applicable: true, pct: 100 }] },
      { member: { rpName: "Caio" }, hasGoals: true, exempt: true, cells: [{ applicable: true, pct: 0 }] },
      { member: { rpName: "Duda" }, hasGoals: false, exempt: false, cells: [{ applicable: false }] },
    ]);
    expect(rows).toEqual([{ name: "Bia", pct: 100 }, { name: "Ana", pct: 75 }]);
  });

  const weeks = lastWeeks(NOW, 2);
  const OLD = at("2026-01-01T12:00:00-03:00");
  const member = (id: string, rankId: string | null = null, joinedAt = OLD) => ({ id, rankId, joinedAt });
  const goal = { itemId: "metal", rankId: null, quantity: 10, createdAt: OLD };
  const delivery = (memberId: string, createdAt: string, quantity = 10) => ({ memberId, itemId: "metal", quantity, createdAt: at(createdAt) });

  it("calcula quem bateu em cada semana", () => {
    const rows = weeklyCompletion({ goals: [goal], members: [member("a"), member("b")], deliveries: [delivery("a", "2026-11-03T12:00:00-03:00"), delivery("a", "2026-11-10T12:00:00-03:00"), delivery("b", "2026-11-10T12:00:00-03:00")], absences: [] }, weeks);
    expect(rows).toEqual([
      { label: "02/11", pct: 50, complete: 1, total: 2 },
      { label: "09/11", pct: 100, complete: 2, total: 2 },
    ]);
  });
  it("omite as semanas anteriores à meta", () => {
    const rows = weeklyCompletion({ goals: [{ ...goal, createdAt: at("2026-11-10T12:00:00-03:00") }], members: [member("a")], deliveries: [], absences: [] }, weeks);
    expect(rows.map((r) => r.label)).toEqual(["09/11"]);
  });
  it("tira da conta dispensados e quem ainda não tinha entrado", () => {
    const rows = weeklyCompletion(
      {
        goals: [goal],
        members: [member("a"), member("ausente"), member("novo", null, at("2026-11-10T12:00:00-03:00"))],
        deliveries: [delivery("a", "2026-11-03T12:00:00-03:00")],
        absences: [{ memberId: "ausente", startsAt: at("2026-11-02T00:00:00-03:00"), endsAt: at("2026-11-09T23:59:00-03:00") }],
      },
      [weeks[0]],
    );
    expect(rows).toEqual([{ label: "02/11", pct: 100, complete: 1, total: 1 }]);
  });
  it("meta da patente vence a geral do mesmo item", () => {
    const rows = weeklyCompletion({ goals: [goal, { ...goal, rankId: "r", quantity: 5 }], members: [member("a", "r")], deliveries: [delivery("a", "2026-11-10T12:00:00-03:00", 5)], absences: [] }, [weeks[1]]);
    expect(rows[0].complete).toBe(1);
  });
});
