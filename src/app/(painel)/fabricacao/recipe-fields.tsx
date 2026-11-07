import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import type { Item, Recipe, RecipeInput } from "@/generated/prisma/client";
import { RecipeInputs } from "./recipe-inputs";

export function RecipeFields({
  items,
  recipe,
}: {
  items: Item[];
  recipe?: Recipe & { inputs: RecipeInput[] };
}) {
  const simple = items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Produz" htmlFor="r-output">
          <NativeSelect id="r-output" name="outputItemId" required defaultValue={recipe?.outputItemId ?? ""}>
            <option value="">Escolha o item…</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quantidade" htmlFor="r-qty">
          <Input id="r-qty" name="outputQty" type="number" min={1} defaultValue={recipe?.outputQty ?? 1} />
        </Field>
      </div>
      <RecipeInputs items={simple} defaultRows={recipe?.inputs.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tempo por rodada (min)" htmlFor="r-min">
          <Input id="r-min" name="minutes" type="number" min={0} defaultValue={recipe?.minutes ?? ""} />
        </Field>
        <Field label="Onde fabrica" htmlFor="r-loc">
          <Input id="r-loc" name="location" defaultValue={recipe?.location ?? ""} placeholder="Ex.: Galpão do porto" />
        </Field>
      </div>
      <Field label="Observações" htmlFor="r-notes">
        <Textarea id="r-notes" name="notes" rows={2} defaultValue={recipe?.notes ?? ""} />
      </Field>
    </div>
  );
}
