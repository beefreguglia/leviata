/**
 * Calculadora de fabricação (pura, sem banco — testável).
 *
 * Dada uma meta ("quero 10 Pistolas"), abre a árvore de receitas até as
 * matérias-primas. A demanda de cada item é SOMADA antes de arredondar as
 * rodadas, então um insumo intermediário usado em vários lugares não é
 * fabricado a mais.
 */

export type CraftRecipe = {
  id: string;
  outputItemId: string;
  outputQty: number;
  minutes: number | null;
  inputs: { itemId: string; quantity: number }[];
};

export type CraftStep = {
  itemId: string;
  recipeId: string;
  /** quantas vezes a receita precisa rodar */
  runs: number;
  /** quanto é produzido (runs × outputQty) */
  produced: number;
  /** quanto é de fato necessário */
  needed: number;
  /** sobra por causa do arredondamento */
  leftover: number;
  minutes: number | null;
};

export type CraftPlan = {
  /** etapas de fabricação, da matéria-prima para o produto final */
  steps: CraftStep[];
  /** matérias-primas (itens sem receita) e quantidades totais */
  raw: { itemId: string; quantity: number }[];
  /** soma do tempo de todas as rodadas (null se alguma receita não tem tempo) */
  totalMinutes: number | null;
};

export class CraftCycleError extends Error {
  constructor(public itemIds: string[]) {
    super("As receitas formam um ciclo (um item depende dele mesmo)");
  }
}

export function planCraft(
  targetItemId: string,
  quantity: number,
  recipes: CraftRecipe[],
  opts: { expand?: boolean } = {},
): CraftPlan {
  const expand = opts.expand ?? true;
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantidade deve ser um inteiro maior que zero");

  const recipeOf = new Map<string, CraftRecipe>();
  for (const r of recipes) if (!recipeOf.has(r.outputItemId)) recipeOf.set(r.outputItemId, r);

  // ordem topológica (produto antes dos insumos), detectando ciclos
  const order: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (itemId: string, depth: number, path: string[]) => {
    const s = state.get(itemId);
    if (s === "done") return;
    if (s === "visiting") throw new CraftCycleError([...path, itemId]);
    state.set(itemId, "visiting");
    const recipe = recipeOf.get(itemId);
    const canExpand = recipe && (expand || depth === 0);
    if (canExpand) for (const input of recipe.inputs) visit(input.itemId, depth + 1, [...path, itemId]);
    state.set(itemId, "done");
    order.push(itemId);
  };
  visit(targetItemId, 0, []);
  order.reverse();

  const demand = new Map<string, number>([[targetItemId, quantity]]);
  const steps: CraftStep[] = [];
  const raw: { itemId: string; quantity: number }[] = [];
  let totalMinutes: number | null = 0;

  for (const itemId of order) {
    const needed = demand.get(itemId) ?? 0;
    if (needed <= 0) continue;
    const recipe = recipeOf.get(itemId);
    const isTarget = itemId === targetItemId;
    if (!recipe || (!expand && !isTarget)) {
      raw.push({ itemId, quantity: needed });
      continue;
    }
    const runs = Math.ceil(needed / recipe.outputQty);
    const produced = runs * recipe.outputQty;
    steps.push({
      itemId,
      recipeId: recipe.id,
      runs,
      produced,
      needed,
      leftover: produced - needed,
      minutes: recipe.minutes == null ? null : recipe.minutes * runs,
    });
    if (recipe.minutes == null) totalMinutes = null;
    else if (totalMinutes != null) totalMinutes += recipe.minutes * runs;
    for (const input of recipe.inputs) demand.set(input.itemId, (demand.get(input.itemId) ?? 0) + input.quantity * runs);
  }

  return { steps: steps.reverse(), raw: raw.sort((a, b) => a.itemId.localeCompare(b.itemId)), totalMinutes };
}

/** "1h 25min" / "40min" */
export function fmtMinutes(min: number | null | undefined) {
  if (min == null) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ---------------- Calculadora rápida (sem cadastro) ----------------

export type QuickMaterial = {
  name: string;
  /** quanto do material vai em UMA fabricação */
  perCraft: number;
  /** quanto já temos (opcional) */
  have?: number;
};

export type QuickResult = {
  /** quantas vezes precisa fabricar para chegar na meta */
  crafts: number;
  /** quanto sai no total (crafts × rende) */
  produced: number;
  leftover: number;
  materials: { name: string; total: number; have: number; missing: number }[];
  /** com o que já temos, quantas unidades dá pra fazer agora */
  canMakeNow: number;
  /** material que está limitando (null se nenhum material informado) */
  bottleneck: string | null;
};

/**
 * "Para fazer 1 rodada gasto X de cada material e sai `yieldPerCraft` unidades;
 * quero `target` unidades" → total de cada material, o que falta e quanto dá pra fazer já.
 */
export function quickCalc(materials: QuickMaterial[], target: number, yieldPerCraft = 1): QuickResult {
  const valid = materials.filter((m) => m.name.trim() && m.perCraft > 0);
  const per = Math.max(1, Math.floor(yieldPerCraft));
  const goal = Math.max(0, Math.floor(target));
  const crafts = Math.ceil(goal / per);

  const rows = valid.map((m) => {
    const total = m.perCraft * crafts;
    const have = Math.max(0, m.have ?? 0);
    return { name: m.name.trim(), total, have, missing: Math.max(0, total - have) };
  });

  let canCraftNow = Infinity;
  let bottleneck: string | null = null;
  for (const m of valid) {
    const possible = Math.floor(Math.max(0, m.have ?? 0) / m.perCraft);
    if (possible < canCraftNow) {
      canCraftNow = possible;
      bottleneck = m.name.trim();
    }
  }
  if (!valid.length) canCraftNow = 0;

  return {
    crafts,
    produced: crafts * per,
    leftover: crafts * per - goal,
    materials: rows,
    canMakeNow: canCraftNow * per,
    bottleneck,
  };
}
