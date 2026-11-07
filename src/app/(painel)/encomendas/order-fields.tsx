import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { toDateInputBRT } from "@/lib/dates";
import type { Order } from "@/generated/prisma/client";
import { MoneyInput } from "@/components/forms/masked-inputs";

export function OrderFields({
  order,
  items,
  factions,
  members,
}: {
  order?: Order;
  items: { id: string; name: string }[];
  factions: { id: string; name: string }[];
  members: { id: string; rpName: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" htmlFor="o-customer">
          <Input id="o-customer" name="customer" required defaultValue={order?.customer} placeholder="Nome de quem pediu" />
        </Field>
        <Field label="Facção do cliente (opcional)" htmlFor="o-faction">
          <NativeSelect id="o-faction" name="factionId" defaultValue={order?.factionId ?? ""}>
            <option value="">—</option>
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_110px_140px]">
        <Field label="Item" htmlFor="o-item">
          <NativeSelect id="o-item" name="itemId" required defaultValue={order?.itemId ?? ""}>
            <option value="">Escolha…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quantidade" htmlFor="o-qty">
          <Input id="o-qty" name="quantity" type="number" min={1} required defaultValue={order?.quantity ?? 1} />
        </Field>
        <Field label="Preço unitário (R$)" htmlFor="o-price">
          <MoneyInput id="o-price" name="unitPrice" defaultValue={order?.unitPrice ?? ""} placeholder="0" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prazo (opcional)" htmlFor="o-due">
          <Input id="o-due" name="dueAt" type="date" defaultValue={toDateInputBRT(order?.dueAt)} />
        </Field>
        <Field label="Responsável" htmlFor="o-assigned">
          <NativeSelect id="o-assigned" name="assignedToId" defaultValue={order?.assignedToId ?? ""}>
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.rpName}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Observações" htmlFor="o-notes">
        <Textarea id="o-notes" name="notes" rows={2} defaultValue={order?.notes ?? ""} />
      </Field>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
        Cliente já pagou
        <input type="checkbox" name="paid" defaultChecked={order?.paid} className="size-5 accent-[var(--primary)]" />
      </label>
    </div>
  );
}
