import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Input } from "@/components/ui/input";
import { RISK } from "@/lib/labels";
import type { ActionResult } from "@/lib/actions";
import type { FarmGuide, Item } from "@/generated/prisma/client";

export function FarmForm({
  action,
  guide,
  items,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  guide?: FarmGuide;
  items: Item[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Field label="Título" htmlFor="title">
        <Input id="title" name="title" required defaultValue={guide?.title} placeholder="Ex.: Farm de cobre na pedreira" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Item que rende" htmlFor="itemId" hint="Liga o guia à calculadora de fabricação.">
          <NativeSelect id="itemId" name="itemId" defaultValue={guide?.itemId ?? ""}>
            <option value="">Nenhum</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Risco" htmlFor="risk">
          <NativeSelect id="risk" name="risk" defaultValue={guide?.risk ?? "BAIXO"}>
            {Object.entries(RISK).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {items.length === 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Nenhum item cadastrado. Cadastre em <Link href="/fabricacao" className="text-cyan-light hover:underline">Fabricação</Link>.
        </p>
      )}
      <Field label="Local" htmlFor="location">
        <Input id="location" name="location" required defaultValue={guide?.location} placeholder="Ex.: Pedreira de Sandy Shores" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quanto rende por rodada" htmlFor="amountPerRun">
          <Input id="amountPerRun" name="amountPerRun" type="number" min={0} defaultValue={guide?.amountPerRun ?? ""} />
        </Field>
        <Field label="Minutos por rodada" htmlFor="minutesPerRun">
          <Input id="minutesPerRun" name="minutesPerRun" type="number" min={0} defaultValue={guide?.minutesPerRun ?? ""} />
        </Field>
      </div>
      <Field label="Requisitos" htmlFor="requirements" hint="Ex.: picareta, mochila, carro com porta-malas grande">
        <Input id="requirements" name="requirements" defaultValue={guide?.requirements ?? ""} />
      </Field>
      <Field label="Prints do local">
        <ImageInput name="imageIds" multiple defaultIds={guide?.imageIds ?? []} label="Adicionar prints" />
      </Field>
      <Field label="Como farmar">
        <MarkdownEditor name="howTo" defaultValue={guide?.howTo} rows={12} placeholder={"1. Vá até…\n2. Use a picareta…"} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
