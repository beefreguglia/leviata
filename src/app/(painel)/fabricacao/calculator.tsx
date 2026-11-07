"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalculatorIcon, ClockIcon, HammerIcon, SproutIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { CraftCycleError, fmtMinutes, planCraft, type CraftRecipe } from "@/lib/crafting";

type ItemLite = { id: string; name: string; unit: string; farmGuideId: string | null };

/** Calculadora: escolhe o produto e a quantidade, mostra o que fabricar e o que farmar. */
export function CraftCalculator({ items, recipes }: { items: ItemLite[]; recipes: CraftRecipe[] }) {
  const craftable = items.filter((i) => recipes.some((r) => r.outputItemId === i.id));
  const [target, setTarget] = useState(craftable[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [expand, setExpand] = useState(true);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const plan = useMemo(() => {
    if (!target || !Number.isInteger(qty) || qty < 1) return null;
    try {
      return planCraft(target, qty, recipes, { expand });
    } catch (err) {
      return err instanceof CraftCycleError ? "ciclo" : null;
    }
  }, [target, qty, expand, recipes]);

  if (!craftable.length) {
    return (
      <p className="rounded-card bg-card px-5 py-5 text-base text-muted-foreground">
        Cadastre uma receita para usar a calculadora.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-card bg-card p-6" data-testid="calculator">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Quero fabricar" htmlFor="calc-item">
          <NativeSelect id="calc-item" value={target} onChange={(e) => setTarget(e.target.value)}>
            {craftable.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quantidade" htmlFor="calc-qty">
          <Input id="calc-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value))))} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-grey-200">
        <input type="checkbox" checked={expand} onChange={(e) => setExpand(e.target.checked)} className="size-5 accent-[var(--primary)]" />
        Abrir até a matéria-prima (inclui insumos que também são fabricados)
      </label>

      {plan === "ciclo" && <p className="text-sm text-danger-light">As receitas formam um ciclo — revise-as.</p>}
      {plan && plan !== "ciclo" && (
        <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-grey-200">
              <SproutIcon className="size-4 text-success" /> Precisa juntar
            </h3>
            <ul className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700" data-testid="calc-raw">
              {plan.raw.map((r) => {
                const it = byId.get(r.itemId);
                return (
                  <li key={r.itemId} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                    <span className="text-base text-grey-100">
                      {it?.name}
                      {it?.farmGuideId && (
                        <Link href={`/farm/${it.farmGuideId}`} className="ml-2 text-xs text-cyan-light hover:underline">
                          onde farmar
                        </Link>
                      )}
                    </span>
                    <span className="text-base font-bold tabular-nums text-grey-100">
                      {r.quantity.toLocaleString("pt-BR")} <span className="text-xs font-normal text-muted-foreground">{it?.unit}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-grey-200">
              <HammerIcon className="size-4 text-primary" /> Fabricar (nesta ordem)
            </h3>
            <ol className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700" data-testid="calc-steps">
              {plan.steps.map((s, i) => {
                const it = byId.get(s.itemId);
                return (
                  <li key={s.itemId} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                    <span className="text-base text-grey-100">
                      <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                      {it?.name} <span className="text-sm text-muted-foreground">× {s.runs} rodada{s.runs > 1 ? "s" : ""}</span>
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      {s.produced} {it?.unit}
                      {s.leftover > 0 && <span className="block text-warning">sobra {s.leftover}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="flex items-center gap-2 text-sm text-grey-300">
              <ClockIcon className="size-4 text-muted-foreground" /> Tempo total de fabricação:{" "}
              <strong className="text-grey-100">{fmtMinutes(plan.totalMinutes)}</strong>
            </p>
          </section>
        </div>
      )}
      {!plan && <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalculatorIcon className="size-4" /> Informe uma quantidade.</p>}
    </div>
  );
}
