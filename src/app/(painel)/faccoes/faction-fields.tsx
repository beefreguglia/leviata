import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { FACTION_RELATION } from "@/lib/labels";
import type { Faction } from "@/generated/prisma/client";

export function FactionFields({ faction }: { faction?: Faction }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px_64px]">
        <Field label="Nome" htmlFor="f-name">
          <Input id="f-name" name="name" required defaultValue={faction?.name} placeholder="Ex.: Ballas" />
        </Field>
        <Field label="Sigla" htmlFor="f-tag">
          <Input id="f-tag" name="tag" maxLength={10} defaultValue={faction?.tag ?? ""} />
        </Field>
        <Field label="Cor" htmlFor="f-color">
          <Input id="f-color" name="color" type="color" defaultValue={faction?.color ?? "#8d8d99"} className="cursor-pointer p-1" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Relação com a Leviata" htmlFor="f-relation">
          <NativeSelect id="f-relation" name="relation" defaultValue={faction?.relation ?? "NEUTRA"}>
            {Object.entries(FACTION_RELATION).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Tipo" htmlFor="f-kind">
          <Input id="f-kind" name="kind" defaultValue={faction?.kind ?? ""} placeholder="Gangue, máfia, MC, polícia…" />
        </Field>
        <Field label="Líder" htmlFor="f-leader">
          <Input id="f-leader" name="leader" defaultValue={faction?.leader ?? ""} />
        </Field>
        <Field label="Território" htmlFor="f-territory">
          <Input id="f-territory" name="territory" defaultValue={faction?.territory ?? ""} placeholder="Ex.: Grove Street, Davis" />
        </Field>
      </div>
      <Field label="Logo (opcional)">
        <ImageInput name="logoId" defaultIds={faction?.logoId ? [faction.logoId] : []} label="Adicionar logo" />
      </Field>
      <Field label="O que sabemos sobre eles">
        <MarkdownEditor name="description" defaultValue={faction?.description ?? ""} rows={6} />
      </Field>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
        Facção ativa na cidade
        <input type="checkbox" name="isActive" defaultChecked={faction?.isActive ?? true} className="size-5 accent-[var(--primary)]" />
      </label>
    </div>
  );
}
