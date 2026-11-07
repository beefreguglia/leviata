"use client";

import { useState } from "react";
import { FlagIcon, UserIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { money } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { MoneyInput } from "@/components/forms/masked-inputs";

type Opt = { id: string; name: string };

/** Comprador (facção ou player) → item, quantidade e preço → pagamento. */
export function SaleFields({
  items,
  factions,
  members,
  me,
}: {
  items: (Opt & { stock: number; unit: string | null })[];
  factions: Opt[];
  members: Opt[];
  me?: string;
}) {
  const [kind, setKind] = useState<"PLAYER" | "FACCAO">("PLAYER");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const total = (Number(qty) || 0) * (Number(price) || 0);
  const stock = items.find((i) => i.id === itemId)?.stock;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold text-grey-200">Vendeu para</legend>
        <div role="radiogroup" aria-label="Tipo de comprador" className="grid grid-cols-2 gap-2">
          {(
            [
              ["PLAYER", "Player", UserIcon],
              ["FACCAO", "Facção", FlagIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <label
              key={value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border-2 text-base font-bold transition-colors",
                kind === value ? "border-primary bg-cyan-low text-cyan-light" : "border-transparent bg-input text-grey-300 hover:border-grey-500",
              )}
            >
              <input type="radio" name="buyerKind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              <Icon className="size-4" /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "FACCAO" ? (
        <Field label="Facção" htmlFor="s-faction" hint={factions.length ? undefined : "Cadastre a facção em Cidade → Facções."}>
          <NativeSelect id="s-faction" name="factionId" required defaultValue="">
            <option value="">Escolha…</option>
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Nome do player" htmlFor="s-buyer">
            <Input id="s-buyer" name="buyerName" required placeholder="Ex.: João Silva" autoComplete="off" />
          </Field>
          <Field label="ID (opcional)" htmlFor="s-passport">
            <Input id="s-passport" name="buyerPassport" inputMode="numeric" placeholder="0000" autoComplete="off" />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_110px_150px]">
        <Field label="Item" htmlFor="s-item" hint={stock !== undefined ? `No baú: ${stock.toLocaleString("pt-BR")}` : undefined}>
          <NativeSelect id="s-item" name="itemId" required value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Escolha…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quantidade" htmlFor="s-qty">
          <Input id="s-qty" name="quantity" type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Preço unitário (R$)" htmlFor="s-price">
          <MoneyInput id="s-price" name="unitPrice" value={price} onValueChange={setPrice} placeholder="0" />
        </Field>
      </div>

      <p className="flex items-center justify-between rounded-md bg-input px-4 py-3 text-base" data-testid="sale-total">
        <span className="text-muted-foreground">Total</span>
        <strong className="text-lg tabular-nums text-grey-100">{money(total)}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pagamento entrou como" htmlFor="s-payment">
          <NativeSelect id="s-payment" name="payment" defaultValue="DINHEIRO_SUJO">
            <option value="DINHEIRO_SUJO">Dinheiro sujo</option>
            <option value="DINHEIRO_LIMPO">Dinheiro limpo</option>
          </NativeSelect>
        </Field>
        <Field label="Quem vendeu" htmlFor="s-seller">
          <NativeSelect id="s-seller" name="sellerId" defaultValue={me ?? ""}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
        Tirar o item do estoque do baú
        <input type="checkbox" name="fromVault" defaultChecked className="size-5 accent-[var(--primary)]" />
      </label>

      <Field label="Observação (opcional)" htmlFor="s-notes">
        <Textarea id="s-notes" name="notes" rows={2} />
      </Field>
    </div>
  );
}
