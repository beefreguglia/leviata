"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { key: number; name: string; quantity: number; notes: string };

const SUGGESTIONS = ["Piloto", "Negociador", "Contenção", "Atirador", "Hacker", "Vigia", "Fuga"];

/** Funções do perímetro (nome, quantidade, observação) → roleName[] / roleQty[] / roleNotes[]. */
export function RolesInput({ defaultRows = [] }: { defaultRows?: { name: string; quantity: number; notes: string | null }[] }) {
  const [rows, setRows] = useState<Row[]>(
    (defaultRows.length ? defaultRows : [{ name: "", quantity: 1, notes: "" }]).map((r, i) => ({ key: i, ...r, notes: r.notes ?? "" })),
  );
  const total = rows.reduce((n, r) => n + (r.name.trim() ? r.quantity || 0 : 0), 0);
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (name = "") => setRows((rs) => [...rs, { key: Math.max(0, ...rs.map((r) => r.key)) + 1, name, quantity: 1, notes: "" }]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-grey-200">
        Funções <span className="text-xs font-normal text-muted-foreground">{total} vaga{total === 1 ? "" : "s"} no total</span>
      </legend>
      {rows.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[1fr_72px_48px] gap-2 sm:grid-cols-[1fr_88px_1fr_48px]">
          <Input name="roleName" aria-label={`Função ${i + 1}`} placeholder="Ex.: Piloto" value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} list="role-suggestions" />
          <Input name="roleQty" aria-label={`Quantidade da função ${i + 1}`} type="number" min={1} max={20} value={r.quantity} onChange={(e) => set(r.key, { quantity: Number(e.target.value) })} />
          <Input name="roleNotes" aria-label={`Observação da função ${i + 1}`} placeholder="Observação" value={r.notes} onChange={(e) => set(r.key, { notes: e.target.value })} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
          <Button type="button" variant="ghost" size="icon" className="size-12" aria-label={`Remover função ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
            <XIcon />
          </Button>
        </div>
      ))}
      <datalist id="role-suggestions">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="ghost" className="text-cyan-light" onClick={() => add()}>
          <PlusIcon /> Adicionar função
        </Button>
        {SUGGESTIONS.filter((s) => !rows.some((r) => r.name === s)).slice(0, 4).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="inline-flex h-7 items-center rounded-full bg-grey-700 px-3 text-xs font-bold text-grey-200 hover:bg-grey-600">
            + {s}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
