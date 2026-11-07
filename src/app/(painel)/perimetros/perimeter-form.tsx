import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Input } from "@/components/ui/input";
import { RISK } from "@/lib/labels";
import type { ActionResult } from "@/lib/actions";
import type { Perimeter, PerimeterRole } from "@/generated/prisma/client";
import { RolesInput } from "./roles-input";

export function PerimeterForm({
  action,
  perimeter,
  pins,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  perimeter?: Perimeter & { roles: PerimeterRole[] };
  pins: { id: string; title: string }[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do plano" htmlFor="name">
          <Input id="name" name="name" required defaultValue={perimeter?.name} placeholder="Ex.: Fleeca da Praça — entrada pelos fundos" />
        </Field>
        <Field label="Alvo" htmlFor="target">
          <Input id="target" name="target" required defaultValue={perimeter?.target} placeholder="Ex.: Banco Fleeca" />
        </Field>
        <Field label="Dificuldade" htmlFor="difficulty">
          <NativeSelect id="difficulty" name="difficulty" defaultValue={perimeter?.difficulty ?? "MEDIO"}>
            {Object.entries(RISK).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label.replace("Risco", "Dificuldade")}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Mínimo de membros" htmlFor="minMembers">
          <Input id="minMembers" name="minMembers" type="number" min={0} defaultValue={perimeter?.minMembers ?? ""} />
        </Field>
      </div>
      <Field label="Lugar no mapa (opcional)" htmlFor="pinId">
        <NativeSelect id="pinId" name="pinId" defaultValue={perimeter?.pinId ?? ""}>
          <option value="">Nenhum</option>
          {pins.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <RolesInput defaultRows={perimeter?.roles} />
      <Field label="Plano">
        <MarkdownEditor name="plan" defaultValue={perimeter?.plan} rows={10} placeholder={"## Chegada\n…\n## Dentro do alvo\n…"} />
      </Field>
      <Field label="Rotas de fuga">
        <MarkdownEditor name="escapeRoutes" defaultValue={perimeter?.escapeRoutes ?? ""} rows={5} placeholder="- Rota 1: …" />
      </Field>
      <Field label="Prints (posições, rotas)">
        <ImageInput name="imageIds" multiple defaultIds={perimeter?.imageIds ?? []} label="Adicionar prints" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
