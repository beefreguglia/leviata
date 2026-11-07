import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field } from "@/components/forms/fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions";
import type { RulePage } from "@/generated/prisma/client";

export function RuleForm({
  action,
  page,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  page?: RulePage;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
        <Field label="Título" htmlFor="title">
          <Input id="title" name="title" required defaultValue={page?.title} placeholder="Ex.: Regras de ação" />
        </Field>
        <Field label="Ordem" htmlFor="order">
          <Input id="order" name="order" type="number" defaultValue={page?.order ?? 0} />
        </Field>
      </div>
      <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-card bg-card px-5 py-4 text-base">
        <span>
          Visível para recrutas
          <span className="block text-sm text-muted-foreground">Quem ainda não tem acesso ao painel também vê esta página.</span>
        </span>
        <input type="checkbox" name="isPublic" defaultChecked={page?.isPublic} className="size-5 accent-[var(--primary)]" />
      </label>
      <MarkdownEditor name="content" defaultValue={page?.content} placeholder="## 1. Primeira regra" />
      <div className="flex justify-end">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
