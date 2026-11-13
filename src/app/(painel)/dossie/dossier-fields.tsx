import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { PhoneInput } from "@/components/forms/masked-inputs";
import { MarkdownEditor } from "@/components/markdown-editor";
import { DOSSIER_STATUS, RISK } from "@/lib/labels";
import { DOSSIER_STATUSES, THREATS } from "@/lib/schemas/dossier";
import type { Dossier, Faction } from "@/generated/prisma/client";

export function DossierFields({ dossier, factions }: { dossier?: Dossier; factions: Pick<Faction, "id" | "name">[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="d-name">
          <Input id="d-name" name="name" required defaultValue={dossier?.name} autoComplete="off" spellCheck={false} placeholder="Nome na cidade" />
        </Field>
        <Field label="Apelido" htmlFor="d-nickname">
          <Input id="d-nickname" name="nickname" autoComplete="off" spellCheck={false} defaultValue={dossier?.nickname ?? ""} />
        </Field>
        <Field label="Telefone" htmlFor="d-phone">
          <PhoneInput id="d-phone" name="phone" defaultValue={dossier?.phone} />
        </Field>
        <Field label="ID" htmlFor="d-passport">
          <Input id="d-passport" name="passport" inputMode="numeric" autoComplete="off" defaultValue={dossier?.passport ?? ""} />
        </Field>
        <Field label="Situação" htmlFor="d-status">
          <NativeSelect id="d-status" name="status" defaultValue={dossier?.status ?? "DESCONHECIDO"}>
            {DOSSIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DOSSIER_STATUS[s].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Ameaça" htmlFor="d-threat">
          <NativeSelect id="d-threat" name="threat" defaultValue={dossier?.threat ?? "BAIXO"}>
            {THREATS.map((t) => (
              <option key={t} value={t}>
                {RISK[t].label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Facção" htmlFor="d-faction">
        <NativeSelect id="d-faction" name="factionId" defaultValue={dossier?.factionId ?? ""}>
          <option value="">Nenhuma ou desconhecida</option>
          {factions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Prints">
        <ImageInput name="imageIds" multiple max={8} defaultIds={dossier?.imageIds ?? []} label="Adicionar prints" />
      </Field>
      <Field label="O que sabemos">
        <MarkdownEditor name="notes" defaultValue={dossier?.notes ?? ""} rows={6} />
      </Field>
    </div>
  );
}
