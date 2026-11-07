import { describe, expect, it } from "vitest";
import { groupByDay, monthGrid, monthKey, monthRange, parseMonth, shiftMonth } from "@/lib/agenda";
import { fromDateTimeInputBRT, toDateTimeInputBRT, fmtTime } from "@/lib/dates";
import { lineupProblems, parseEventForm, parseLineupForm, parsePerimeterForm, parsePinForm, parseReportForm, perimeterSlots } from "@/lib/schemas/ops";

const fd = (data: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) for (const i of Array.isArray(v) ? v : [v]) f.append(k, i);
  return f;
};

describe("calendário", () => {
  it("novembro/2026 começa no domingo 1º e tem 5 semanas", () => {
    const g = monthGrid(2026, 11, new Date("2026-11-06T15:00:00Z"));
    expect(g).toHaveLength(5);
    expect(g[0][0]).toMatchObject({ key: "2026-11-01", day: 1, inMonth: true });
    expect(g.flat().find((d) => d.isToday)?.key).toBe("2026-11-06");
    expect(g.at(-1)!.at(-1)).toMatchObject({ key: "2026-12-05", inMonth: false });
  });

  it("fevereiro/2026 completa a primeira semana com dias de janeiro", () => {
    const g = monthGrid(2026, 2);
    expect(g[0][0]).toMatchObject({ key: "2026-02-01", inMonth: true });
    const g2 = monthGrid(2026, 4);
    expect(g2[0][0]).toMatchObject({ key: "2026-03-29", inMonth: false });
  });

  it("navega entre meses e lê ?mes=", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual([2027, 1]);
    expect(shiftMonth(2026, 1, -1)).toEqual([2025, 12]);
    expect(parseMonth("2026-03")).toEqual([2026, 3]);
    expect(parseMonth("2026-13", new Date("2026-11-06T12:00:00Z"))).toEqual([2026, 11]);
    expect(monthKey(2026, 3)).toBe("2026-03");
  });

  it("intervalo do mês cobre a grade inteira em horário de Brasília", () => {
    const r = monthRange(2026, 11);
    expect(r.from.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-12-06T02:59:59.999Z");
  });

  it("agrupa por dia de Brasília (23h de BRT não vira o dia seguinte)", () => {
    const map = groupByDay([
      { id: "b", startsAt: new Date("2026-11-08T02:00:00Z") }, // 07/11 23h BRT
      { id: "a", startsAt: new Date("2026-11-07T23:00:00Z") }, // 07/11 20h BRT
    ]);
    expect(map.get("2026-11-07")?.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("data e hora", () => {
  it("datetime-local em Brasília ida e volta", () => {
    const d = fromDateTimeInputBRT("2026-11-07T20:30");
    expect(d.toISOString()).toBe("2026-11-07T23:30:00.000Z");
    expect(toDateTimeInputBRT(d)).toBe("2026-11-07T20:30");
    expect(fmtTime(d)).toBe("20:30");
  });
});

describe("validações da Fase 3", () => {
  it("evento: término depois do início", () => {
    const ok = parseEventForm(fd({ title: "Fleeca", kind: "ACAO", startsAt: "2026-11-07T20:00", endsAt: "2026-11-07T21:00" }));
    expect(ok.startsAt.toISOString()).toBe("2026-11-07T23:00:00.000Z");
    expect(() => parseEventForm(fd({ title: "Fleeca", startsAt: "2026-11-07T20:00", endsAt: "2026-11-07T19:00" }))).toThrow("término precisa ser depois");
    expect(() => parseEventForm(fd({ title: "Fleeca" }))).toThrow("Informe a data e hora");
  });

  it("perímetro: funções com quantidade", () => {
    const p = parsePerimeterForm(fd({ name: "Fleeca fundos", target: "Fleeca", plan: "x", roleName: ["Piloto", "Contenção", ""], roleQty: ["1", "3", "1"], roleNotes: ["", "Na porta", ""] }));
    expect(p.roles).toEqual([
      { name: "Piloto", quantity: 1, notes: null },
      { name: "Contenção", quantity: 3, notes: "Na porta" },
    ]);
    expect(perimeterSlots(p.roles)).toBe(4);
    expect(() => parsePerimeterForm(fd({ name: "Fleeca fundos", target: "Fleeca", plan: "x" }))).toThrow("pelo menos uma função");
  });

  it("marcador: posição numérica e categoria", () => {
    expect(parsePinForm(fd({ title: "Desmanche", category: "DESMANCHE", x: "120.4", y: "80" }))).toMatchObject({ x: 120.4, y: 80 });
    expect(() => parsePinForm(fd({ title: "Desmanche", x: "-1", y: "3" }))).toThrow("Fora do mapa");
    expect(() => parsePinForm(fd({ title: "Desmanche", category: "BANCO", x: "1", y: "1" }))).toThrow("Categoria inválida");
  });

  it("relatório", () => {
    expect(parseReportForm(fd({ result: "SUCESSO", money: "150000", casualties: "", arrests: "1" }))).toMatchObject({ result: "SUCESSO", money: 150000, casualties: null, arrests: 1 });
    expect(() => parseReportForm(fd({ result: "OK" }))).toThrow("Resultado inválido");
  });

  it("escalação: lê vagas e aponta repetidos e indisponíveis", () => {
    const slots = parseLineupForm(fd({ slotRole: ["Piloto", "Contenção", "Contenção", ""], slotMember: ["m1", "m2", "m1", ""], slotVehicle: ["Sultan", "", "", ""], slotNotes: ["", "", "", ""] }));
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ role: "Piloto", memberId: "m1", vehicle: "Sultan", notes: null });
    expect(lineupProblems(slots, new Map([["m2", "ausente"]]))).toEqual(["indisponivel:m2", "duplicado:m1"]);
    expect(lineupProblems([{ role: "Piloto", memberId: null, vehicle: null, notes: null }], new Map())).toEqual([]);
  });
});
