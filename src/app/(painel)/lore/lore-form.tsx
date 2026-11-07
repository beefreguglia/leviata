import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, NativeSelect } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Input } from "@/components/ui/input";
import { LORE_CATEGORY } from "@/lib/labels";
import { toDateInputBRT } from "@/lib/dates";
import type { ActionResult } from "@/lib/actions";
import type { LoreArticle } from "@/generated/prisma/client";

export function LoreForm({
  action,
  article,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  article?: LoreArticle;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Field label="Capa (opcional)">
        <ImageInput name="coverId" defaultIds={article?.coverId ? [article.coverId] : []} label="Adicionar capa" />
      </Field>
      <Field label="Título" htmlFor="title">
        <Input id="title" name="title" required defaultValue={article?.title} placeholder="Ex.: A queda do Cartel de Vespucci" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria" htmlFor="category">
          <NativeSelect id="category" name="category" defaultValue={article?.category ?? "HISTORIA"}>
            {Object.entries(LORE_CATEGORY).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quando aconteceu na cidade" htmlFor="happenedAt" hint="Usado para ordenar a linha do tempo.">
          <Input id="happenedAt" name="happenedAt" type="date" defaultValue={toDateInputBRT(article?.happenedAt)} />
        </Field>
      </div>
      <Field label="Resumo (aparece na linha do tempo)" htmlFor="summary">
        <Input id="summary" name="summary" maxLength={280} defaultValue={article?.summary ?? ""} placeholder="Uma frase sobre o que aconteceu" />
      </Field>
      <Field label="Tags" htmlFor="tags" hint="Separe por vírgula. Ex.: vespucci, tiroteio, cartel">
        <Input id="tags" name="tags" defaultValue={article?.tags.join(", ")} />
      </Field>
      <MarkdownEditor name="content" defaultValue={article?.content} placeholder="## O que aconteceu" />
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-card bg-card px-5 text-base">
        Destacar no topo da lore
        <input type="checkbox" name="isPinned" defaultChecked={article?.isPinned} className="size-5 accent-[var(--primary)]" />
      </label>
      <div className="flex justify-end">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
