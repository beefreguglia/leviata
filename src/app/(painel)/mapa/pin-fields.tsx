import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { PIN_CATEGORY } from "@/lib/labels";
import type { MapPinData } from "./types";

export function PinFields({
  pin,
  x,
  y,
  farmGuides,
  factions,
}: {
  pin?: MapPinData;
  x: number;
  y: number;
  farmGuides: { id: string; title: string }[];
  factions: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="x" value={Math.round(x)} />
      <input type="hidden" name="y" value={Math.round(y)} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Nome do lugar" htmlFor="pin-title">
          <Input id="pin-title" name="title" required defaultValue={pin?.title} placeholder="Ex.: Desmanche do porto" />
        </Field>
        <Field label="Categoria" htmlFor="pin-category">
          <NativeSelect id="pin-category" name="category" defaultValue={pin?.category ?? "OUTRO"}>
            {Object.entries(PIN_CATEGORY).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Descrição" htmlFor="pin-desc">
        <Textarea id="pin-desc" name="description" rows={3} defaultValue={pin?.description ?? ""} placeholder="Como chegar, horários, cuidados…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guia de farm (opcional)" htmlFor="pin-farm">
          <NativeSelect id="pin-farm" name="farmGuideId" defaultValue={pin?.farmGuide?.id ?? ""}>
            <option value="">Nenhum</option>
            {farmGuides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Facção (opcional)" htmlFor="pin-faction">
          <NativeSelect id="pin-faction" name="factionId" defaultValue={pin?.faction?.id ?? ""}>
            <option value="">Nenhuma</option>
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Prints do lugar">
        <ImageInput name="imageIds" multiple max={6} defaultIds={pin?.imageIds ?? []} label="Adicionar prints" />
      </Field>
    </div>
  );
}
