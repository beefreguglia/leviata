import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions";
import type { Perimeter } from "@/generated/prisma/client";

export function PerimeterForm({
  action,
  perimeter,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  perimeter?: Perimeter;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Field label="Título" htmlFor="name">
        <Input id="name" name="name" required defaultValue={perimeter?.name} placeholder="Ex.: Fleeca da Praça" />
      </Field>
      <Field label="Imagem (vista de cima)">
        <ImageInput name="imageId" defaultIds={perimeter?.imageId ? [perimeter.imageId] : []} label="Enviar imagem" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
