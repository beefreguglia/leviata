"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, PlusIcon, RotateCcwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { quickCalc } from "@/lib/crafting";
import { cn } from "@/lib/utils";

type Row = { key: number; name: string; perCraft: string; have: string };
type Saved = { rows: Row[]; target: string; yieldPer: string };

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
 * Calculadora rápida: digite os materiais de UMA fabricação e a meta.
 * Mostra o total, o que falta (coluna "Já tenho") e quanto dá pra fazer agora.
 */
export function QuickCalculator({ presets = [] }: { presets?: RecipePreset[] }) {
  const [rows, setRows] = useState<Row[]>(EMPTY);
  const [target, setTarget] = useState("1");
  const [yieldPer, setYieldPer] = useState("1");
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, target, yieldPer } satisfies Saved));
    } catch {
      /* ignora */
    }
  }, [rows, target, yieldPer, loaded]);

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
  }

  return (
    <div className="flex flex-col gap-6 rounded-card bg-card p-6" data-testid="quick-calc">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Quero fazer" htmlFor="qc-target">
          <Input id="qc-target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Cada fabricação rende" htmlFor="qc-yield" hint="Ex.: 1 receita faz 10 munições → 10">
          <Input id="qc-yield" inputMode="numeric" value={yieldPer} onChange={(e) => setYieldPer(e.target.value)} />
        </Field>
        {presets.length > 0 && (
          <Field label="Puxar de uma receita" htmlFor="qc-preset">
            <NativeSelect id="qc-preset" value="" onChange={(e) => loadPreset(e.target.value)} className="sm:w-52">
              <option value="">Escolher…</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-grey-200">Materiais para UMA fabricação</legend>
        <div className="hidden grid-cols-[1fr_120px_120px_48px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
          <span>Material</span>
          <span>Gasta</span>
          <span>Já tenho</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-[1fr_80px_80px_48px] gap-2 sm:grid-cols-[1fr_120px_120px_48px]">
            <Input aria-label={`Material ${i + 1}`} placeholder="Ex.: Tecido" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} />
            <Input aria-label={`Quantidade do material ${i + 1}`} inputMode="decimal" placeholder="0" value={r.perCraft} onChange={(e) => update(r.key, { perCraft: e.target.value })} />
            <Input aria-label={`Já tenho do material ${i + 1}`} inputMode="decimal" placeholder="—" value={r.have} onChange={(e) => update(r.key, { have: e.target.value })} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-12"
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
          <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => { setRows(EMPTY); setTarget("1"); setYieldPer("1"); }}>
            <RotateCcwIcon /> Limpar
          </Button>
        </div>
      </fieldset>

      {result.materials.length > 0 && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <h3 className="text-sm font-bold text-grey-200">
            Para fazer {fmt(num(target))}: {result.crafts} fabricaç{result.crafts === 1 ? "ão" : "ões"}
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
