"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MoneyInput } from "@/components/forms/masked-inputs";

/** Campos de movimentação: o seletor de item só aparece quando o tipo é "Item". */
export function MoveFields({
  items,
  members,
}: {
  items: { id: string; name: string; unit: string }[];
  members: { id: string; name: string }[];
}) {
  const [asset, setAsset] = useState("DINHEIRO_SUJO");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Movimento" htmlFor="mv-kind">
          <NativeSelect id="mv-kind" name="kind" defaultValue="ENTRADA">
            <option value="ENTRADA">Entrada (guardar)</option>
            <option value="SAIDA">Saída (retirar)</option>
          </NativeSelect>
        </Field>
        <Field label="O quê" htmlFor="mv-asset">
          <NativeSelect id="mv-asset" name="asset" value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="DINHEIRO_SUJO">Dinheiro sujo</option>
            <option value="DINHEIRO_LIMPO">Dinheiro limpo</option>
            <option value="ITEM">Item</option>
          </NativeSelect>
        </Field>
      </div>
      {asset === "ITEM" && (
        <Field label="Item" htmlFor="mv-item">
          <NativeSelect id="mv-item" name="itemId" required defaultValue="">
            <option value="">Escolha…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={asset === "ITEM" ? "Quantidade" : "Valor (R$)"} htmlFor="mv-qty">
          {asset === "ITEM" ? (
            <Input id="mv-qty" name="quantity" type="number" min={1} required inputMode="numeric" />
          ) : (
            <MoneyInput key="money" id="mv-qty" name="quantity" required placeholder="0" />
          )}
        </Field>
        <Field label="Responsável (opcional)" htmlFor="mv-member">
          <NativeSelect id="mv-member" name="memberId" defaultValue="">
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Motivo" htmlFor="mv-reason">
        <Input id="mv-reason" name="reason" placeholder="Ex.: loot da Fleeca, compra de armas…" />
      </Field>
    </div>
  );
}
