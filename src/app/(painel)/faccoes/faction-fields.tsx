import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { FACTION_RELATION } from "@/lib/labels";
import type { Faction } from "@/generated/prisma/client";

export function FactionFields({ faction }: { faction?: Faction }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto]">
        <Field label="Nome" htmlFor="f-name">
          <Input id="f-name" name="name" required defaultValue={faction?.name} placeholder="Ex.: Ballas" />
        </Field>
        <Field label="Sigla" htmlFor="f-tag">
          <Input id="f-tag" name="tag" maxLength={10} defaultValue={faction?.tag ?? ""} />
        </Field>
        <Field label="Cores" htmlFor="f-color">
          <div className="flex items-center gap-2">
            <Input id="f-color" name="color" type="color" aria-label="Cor principal" defaultValue={faction?.color ?? "#8d8d99"} className="w-16 cursor-pointer p-1" />
            <Input name="color2" type="color" aria-label="Segunda cor" defaultValue={faction?.color2 ?? "#000000"} className="w-16 cursor-pointer p-1" />
            <label className="flex cursor-pointer items-center gap-1.5 text-sm whitespace-nowrap text-grey-300">
              <input type="checkbox" name="hasColor2" defaultChecked={Boolean(faction?.color2)} className="size-4 accent-[var(--primary)]" />
              Usar 2ª cor
            </label>
          </div>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Relação com a Leviatã" htmlFor="f-relation">
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
        <Field label="01 (Líder)" htmlFor="f-leader">
          <Input id="f-leader" name="leader" defaultValue={faction?.leader ?? ""} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="02 (Vice-líder)" htmlFor="f-vice">
          <Input id="f-vice" name="viceLeader" defaultValue={faction?.viceLeader ?? ""} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Território" htmlFor="f-territory" className="sm:col-span-2">
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
