import { describe, expect, it } from "vitest";
import { CraftCycleError, fmtMinutes, planCraft, type CraftRecipe } from "@/lib/crafting";

// Pistola = 8 metal + 2 peça · Peça = 3 metal · Munição (x10) = 20 pólvora + 1 metal + 10 cápsula
const R: CraftRecipe[] = [
  { id: "r-peca", outputItemId: "peca", outputQty: 1, minutes: 3, inputs: [{ itemId: "metal", quantity: 3 }] },
  { id: "r-pistola", outputItemId: "pistola", outputQty: 1, minutes: 10, inputs: [{ itemId: "metal", quantity: 8 }, { itemId: "peca", quantity: 2 }] },
  { id: "r-municao", outputItemId: "municao", outputQty: 10, minutes: 5, inputs: [{ itemId: "polvora", quantity: 20 }, { itemId: "metal", quantity: 1 }, { itemId: "capsula", quantity: 10 }] },
];

describe("planCraft", () => {
  it("abre a árvore até a matéria-prima somando tudo", () => {
    const plan = planCraft("pistola", 3, R);
    expect(plan.raw).toEqual([{ itemId: "metal", quantity: 3 * 8 + 3 * 2 * 3 }]); // 42
    expect(plan.steps.map((s) => [s.itemId, s.runs])).toEqual([["peca", 6], ["pistola", 3]]);
    expect(plan.totalMinutes).toBe(6 * 3 + 3 * 10);
  });

  it("sem abrir: lista só os insumos diretos", () => {
    const plan = planCraft("pistola", 2, R, { expand: false });
    expect(plan.raw).toEqual([{ itemId: "metal", quantity: 16 }, { itemId: "peca", quantity: 4 }]);
    expect(plan.steps).toHaveLength(1);
  });

  it("arredonda rodadas para cima e mostra a sobra", () => {
    const plan = planCraft("municao", 25, R);
    const step = plan.steps[0];
    expect(step).toMatchObject({ runs: 3, produced: 30, needed: 25, leftover: 5 });
    expect(plan.raw).toEqual([
      { itemId: "capsula", quantity: 30 },
      { itemId: "metal", quantity: 3 },
      { itemId: "polvora", quantity: 60 },
    ]);
  });

  it("soma a demanda de um intermediário usado em vários lugares antes de arredondar", () => {
    // kit = 1 peça-x ; caixa = 1 peça-x ; pacote = kit + caixa ; peça-x rende 2 por rodada
    const recipes: CraftRecipe[] = [
      { id: "1", outputItemId: "px", outputQty: 2, minutes: 1, inputs: [{ itemId: "ferro", quantity: 1 }] },
      { id: "2", outputItemId: "kit", outputQty: 1, minutes: 1, inputs: [{ itemId: "px", quantity: 1 }] },
      { id: "3", outputItemId: "caixa", outputQty: 1, minutes: 1, inputs: [{ itemId: "px", quantity: 1 }] },
      { id: "4", outputItemId: "pacote", outputQty: 1, minutes: 1, inputs: [{ itemId: "kit", quantity: 1 }, { itemId: "caixa", quantity: 1 }] },
    ];
    const plan = planCraft("pacote", 1, recipes);
    // px precisa de 2 no total → 1 rodada (e não 2 rodadas de 1)
    expect(plan.steps.find((s) => s.itemId === "px")).toMatchObject({ runs: 1, leftover: 0 });
    expect(plan.raw).toEqual([{ itemId: "ferro", quantity: 1 }]);
    // ordem: insumos antes de quem usa
    const order = plan.steps.map((s) => s.itemId);
    expect(order.indexOf("px")).toBeLessThan(order.indexOf("kit"));
    expect(order.at(-1)).toBe("pacote");
  });

  it("tempo total vira null se alguma receita não tem tempo", () => {
    const recipes = R.map((r) => (r.id === "r-peca" ? { ...r, minutes: null } : r));
    expect(planCraft("pistola", 1, recipes).totalMinutes).toBeNull();
  });

  it("item sem receita vira matéria-prima dele mesmo", () => {
    expect(planCraft("metal", 5, R)).toEqual({ steps: [], raw: [{ itemId: "metal", quantity: 5 }], totalMinutes: 0 });
  });

  it("detecta receitas circulares", () => {
    const cyc: CraftRecipe[] = [
      { id: "a", outputItemId: "A", outputQty: 1, minutes: 1, inputs: [{ itemId: "B", quantity: 1 }] },
      { id: "b", outputItemId: "B", outputQty: 1, minutes: 1, inputs: [{ itemId: "A", quantity: 1 }] },
    ];
    expect(() => planCraft("A", 1, cyc)).toThrow(CraftCycleError);
  });

  it("quantidade precisa ser inteira e positiva", () => {
    expect(() => planCraft("pistola", 0, R)).toThrow();
    expect(() => planCraft("pistola", 1.5, R)).toThrow();
  });
});

describe("fmtMinutes", () => {
  it("formata minutos e horas", () => {
    expect(fmtMinutes(40)).toBe("40min");
    expect(fmtMinutes(60)).toBe("1h");
    expect(fmtMinutes(85)).toBe("1h 25min");
    expect(fmtMinutes(null)).toBe("—");
  });
});

import { quickCalc } from "@/lib/crafting";

describe("calculadora rápida", () => {
  const colete = [
    { name: "Tecido", perCraft: 5, have: 12 },
    { name: "Placa de aço", perCraft: 2, have: 10 },
  ];

  it("multiplica os materiais pela meta", () => {
    const r = quickCalc(colete, 4);
    expect(r.crafts).toBe(4);
    expect(r.materials).toEqual([
      { name: "Tecido", total: 20, have: 12, missing: 8 },
      { name: "Placa de aço", total: 8, have: 10, missing: 0 },
    ]);
  });

  it("considera quanto cada fabricação rende (e a sobra)", () => {
    // 1 fabricação = 10 munições; quero 25 → 3 fabricações, sobram 5
    const r = quickCalc([{ name: "Pólvora", perCraft: 20 }], 25, 10);
    expect(r).toMatchObject({ crafts: 3, produced: 30, leftover: 5 });
    expect(r.materials[0].total).toBe(60);
  });

  it("diz quanto dá pra fazer agora e qual material limita", () => {
    const r = quickCalc(colete, 4);
    expect(r.canMakeNow).toBe(2); // tecido 12/5 = 2
    expect(r.bottleneck).toBe("Tecido");
    expect(quickCalc([{ name: "Pólvora", perCraft: 20, have: 65 }], 1, 10).canMakeNow).toBe(30);
  });

  it("ignora linhas vazias ou com zero e trata entradas ruins", () => {
    const r = quickCalc([{ name: "", perCraft: 3 }, { name: "Metal", perCraft: 0 }, { name: "Cobre", perCraft: 2 }], 3.7);
    expect(r.materials).toEqual([{ name: "Cobre", total: 6, have: 0, missing: 6 }]);
    expect(quickCalc([], 5)).toMatchObject({ canMakeNow: 0, bottleneck: null, materials: [] });
    expect(quickCalc(colete, -2).crafts).toBe(0);
  });
});
