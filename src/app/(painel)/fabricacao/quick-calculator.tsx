"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, PlusIcon, RotateCcwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { quickCalc } from "@/lib/crafting";
import { cn } from "@/lib/utils";

type Row = { key: number; name: string; perCraft: string; have: string };
type Saved = { rows: Row[]; target: string; yieldPer: string; item?: string };

export type RecipePreset = { id: string; name: string; outputQty: number; inputs: { name: string; quantity: number }[] };

const STORAGE_KEY = "leviata:calc-rapida";
const EMPTY: Row[] = [
  { key: 1, name: "", perCraft: "", have: "" },
  { key: 2, name: "", perCraft: "", have: "" },
];

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Calculadora rápida, na ordem em que se pensa:
 * 1. o que vai fabricar e quanto cada fabricação rende;
 * 2. os materiais de UMA fabricação;
 * 3. quantos quer fazer → total de cada material, o que falta e quanto dá pra fazer agora.
 */
export function QuickCalculator({ presets = [] }: { presets?: RecipePreset[] }) {
  const [rows, setRows] = useState<Row[]>(EMPTY);
  const [target, setTarget] = useState("1");
  const [yieldPer, setYieldPer] = useState("1");
  const [item, setItem] = useState("");
  const [loaded, setLoaded] = useState(false);

  // lembra o último cálculo neste navegador (lido só no cliente, depois da hidratação)
  /* eslint-disable react-hooks/set-state-in-effect -- restaurar do localStorage precisa ser após hidratar */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
      if (saved?.rows?.length) {
        setRows(saved.rows);
        setTarget(saved.target);
        setYieldPer(saved.yieldPer);
        setItem(saved.item ?? "");
      }
    } catch {
      /* armazenamento indisponível: começa vazio */
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, target, yieldPer, item } satisfies Saved));
    } catch {
      /* ignora */
    }
  }, [rows, target, yieldPer, item, loaded]);

  const result = useMemo(
    () => quickCalc(rows.map((r) => ({ name: r.name, perCraft: num(r.perCraft), have: num(r.have) })), num(target), num(yieldPer) || 1),
    [rows, target, yieldPer],
  );
  const hasHave = rows.some((r) => num(r.have) > 0);
  const nextKey = () => Math.max(0, ...rows.map((r) => r.key)) + 1;
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function loadPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setRows(p.inputs.map((i, idx) => ({ key: idx + 1, name: i.name, perCraft: String(i.quantity), have: "" })));
    setYieldPer(String(p.outputQty));
    setItem(p.name);
  }

  const itemLabel = item.trim() || "itens";

  return (
    <div className="flex flex-col gap-6 rounded-card bg-card p-6" data-testid="quick-calc">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 flex items-center gap-2 text-base font-bold text-grey-100">
          <Step n={1} /> Qual vai ser a fabricação?
        </legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Item" htmlFor="qc-item">
            <Input id="qc-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex.: Munição de pistola" autoComplete="off" />
          </Field>
          <Field label="Quanto rende cada fabricação" htmlFor="qc-yield" hint="Ex.: 1 fabricação faz 10 munições → 10">
            <Input id="qc-yield" inputMode="numeric" value={yieldPer} onChange={(e) => setYieldPer(e.target.value)} />
          </Field>
        </div>
        {presets.length > 0 && (
          <Field label="Ou puxe de uma receita cadastrada" htmlFor="qc-preset">
            <NativeSelect id="qc-preset" value="" onChange={(e) => loadPreset(e.target.value)}>
              <option value="">Escolher receita…</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3 sm:gap-2">
        <legend className="mb-3 flex items-center gap-2 text-base font-bold text-grey-100">
          <Step n={2} /> Materiais para fabricar 1 vez
        </legend>
        <div className="hidden grid-cols-[1fr_120px_120px_48px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
          <span>Material</span>
          <span>Gasta</span>
          <span>Já tenho</span>
        </div>
        {rows.map((r, i) => (
          // celular: nome + remover numa linha, "gasta" e "já tenho" embaixo; telas maiores: tudo numa linha
          <div
            key={r.key}
            className="grid grid-cols-[1fr_1fr_48px] gap-2 rounded-md bg-grey-700/40 p-2 sm:grid-cols-[1fr_120px_120px_48px] sm:bg-transparent sm:p-0"
          >
            <Input className="col-span-2 sm:col-span-1" aria-label={`Material ${i + 1}`} placeholder="Ex.: Tecido" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} />
            <Input className="row-start-2 sm:row-start-auto" aria-label={`Quantidade do material ${i + 1}`} inputMode="decimal" placeholder="Gasta" value={r.perCraft} onChange={(e) => update(r.key, { perCraft: e.target.value })} />
            <Input className="row-start-2 sm:row-start-auto" aria-label={`Já tenho do material ${i + 1}`} inputMode="decimal" placeholder="Já tenho" value={r.have} onChange={(e) => update(r.key, { have: e.target.value })} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-start-3 row-start-1 size-12 sm:col-start-4"
              aria-label={`Remover material ${i + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" className="text-cyan-light" onClick={() => setRows((rs) => [...rs, { key: nextKey(), name: "", perCraft: "", have: "" }])}>
            <PlusIcon /> Adicionar material
          </Button>
          <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => { setRows(EMPTY); setTarget("1"); setYieldPer("1"); setItem(""); }}>
            <RotateCcwIcon /> Limpar
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 flex items-center gap-2 text-base font-bold text-grey-100">
          <Step n={3} /> Quantos quer fazer?
        </legend>
        <Field label={`Quantidade de ${itemLabel}`} htmlFor="qc-target">
          <Input id="qc-target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="sm:w-60" />
        </Field>
      </fieldset>

      {result.materials.length > 0 && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <h3 className="text-sm font-bold text-grey-200">
            Para fazer {fmt(num(target))} {itemLabel}: {result.crafts} fabricaç{result.crafts === 1 ? "ão" : "ões"}
            {result.leftover > 0 && <span className="font-normal text-warning"> · sobram {fmt(result.leftover)}</span>}
          </h3>
          <ul className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700" data-testid="quick-calc-result">
            {result.materials.map((m) => (
              <li key={m.name} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <span className="text-base text-grey-100">{m.name}</span>
                <span className="flex items-center gap-3 text-right">
                  <strong className="text-base tabular-nums text-grey-100">{fmt(m.total)}</strong>
                  {hasHave && (
                    <span
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-bold",
                        m.missing > 0 ? "bg-danger-low text-danger-light" : "bg-success-low text-success",
                      )}
                    >
                      {m.missing > 0 ? `faltam ${fmt(m.missing)}` : "ok"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {hasHave && (
            <p className={cn("flex items-center gap-2 text-sm", result.materials.every((m) => m.missing === 0) ? "text-success" : "text-grey-300")} data-testid="quick-calc-now">
              {result.materials.every((m) => m.missing === 0) ? <CheckCircle2Icon className="size-4" /> : <TriangleAlertIcon className="size-4 text-warning" />}
              Com o que você tem dá pra fazer <strong className="text-grey-100">{fmt(result.canMakeNow)}</strong> agora
              {result.bottleneck && result.canMakeNow < num(target) && <> · o que limita é <strong className="text-grey-100">{result.bottleneck}</strong></>}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-cyan-low text-sm font-bold text-cyan-light">
      {n}
    </span>
  );
}
