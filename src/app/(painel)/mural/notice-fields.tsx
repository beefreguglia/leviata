import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { NOTICE_PRIORITY } from "@/lib/labels";
import { toDateInputBRT } from "@/lib/dates";
import type { Notice } from "@/generated/prisma/client";

const check = "size-5 accent-[var(--primary)]";

export function NoticeFields({ notice }: { notice?: Notice }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Título" htmlFor="notice-title">
        <Input id="notice-title" name="title" required defaultValue={notice?.title} placeholder="Ex.: Reunião geral sábado 20h" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prioridade" htmlFor="notice-priority">
          <NativeSelect id="notice-priority" name="priority" defaultValue={notice?.priority ?? "NORMAL"}>
            {Object.entries(NOTICE_PRIORITY).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Some do mural em (opcional)" htmlFor="notice-expires">
          <Input id="notice-expires" name="expiresAt" type="date" defaultValue={toDateInputBRT(notice?.expiresAt)} />
        </Field>
      </div>
      <MarkdownEditor name="content" defaultValue={notice?.content} rows={8} placeholder="Escreva o aviso…" />
      <div className="flex flex-col gap-1 rounded-md bg-input px-4">
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-base">
          Fixar no topo do mural e do início
          <input type="checkbox" name="isPinned" defaultChecked={notice?.isPinned} className={check} />
        </label>
        {!notice && (
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 border-t border-grey-700 text-base">
            Enviar no canal de avisos do Discord
            <input type="checkbox" name="notifyDiscord" defaultChecked className={check} />
          </label>
        )}
      </div>
    </div>
  );
}
