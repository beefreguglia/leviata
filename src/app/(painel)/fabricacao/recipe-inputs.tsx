"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/forms/fields";

type Row = { key: number; itemId: string; quantity: number };

/** Linhas de insumos (item + quantidade) que viram inputItemId[] / inputQty[] no formulário. */
export function RecipeInputs({
  items,
  defaultRows = [],
}: {
  items: { id: string; name: string; unit: string }[];
  defaultRows?: { itemId: string; quantity: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    (defaultRows.length ? defaultRows : [{ itemId: "", quantity: 1 }]).map((r, i) => ({ key: i, ...r })),
  );
  const nextKey = () => Math.max(0, ...rows.map((r) => r.key)) + 1;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-grey-200">Insumos</legend>
      {rows.map((row, i) => (
        <div key={row.key} className="flex gap-2">
          <NativeSelect
            name="inputItemId"
            aria-label={`Insumo ${i + 1}`}
            value={row.itemId}
            onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, itemId: e.target.value } : r)))}
            className="flex-1"
          >
            <option value="">Escolha o item…</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            name="inputQty"
            type="number"
            min={1}
            aria-label={`Quantidade do insumo ${i + 1}`}
            value={row.quantity}
            onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, quantity: Number(e.target.value) } : r)))}
            className="w-24"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-12"
            aria-label={`Remover insumo ${i + 1}`}
            disabled={rows.length === 1}
            onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="self-start text-cyan-light"
        onClick={() => setRows((rs) => [...rs, { key: nextKey(), itemId: "", quantity: 1 }])}
      >
        <PlusIcon /> Adicionar insumo
      </Button>
    </fieldset>
  );
}
