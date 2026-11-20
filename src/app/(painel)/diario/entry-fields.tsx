import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { DIARY_KIND } from "@/lib/labels";
import { toDateTimeInputBRT } from "@/lib/dates";
import type { DiaryEntry } from "@/generated/prisma/client";

export function DiaryEntryFields({
  entry,
  factions,
  defaultWhen,
}: {
  entry?: DiaryEntry;
  factions: { id: string; name: string }[];
  /** "2026-11-19T20:30" para registros novos */
  defaultWhen: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="O que aconteceu" htmlFor="d-title">
        <Input id="d-title" name="title" required minLength={3} maxLength={160} defaultValue={entry?.title} placeholder="Ex.: Tiroteio com os Ballas na Grove…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="d-kind">
          <NativeSelect id="d-kind" name="kind" defaultValue={entry?.kind ?? "OUTRO"}>
            {Object.entries(DIARY_KIND).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Quando" htmlFor="d-when">
          <Input id="d-when" name="happenedAt" type="datetime-local" required defaultValue={entry ? toDateTimeInputBRT(entry.happenedAt) : defaultWhen} />
        </Field>
      </div>
      <Field label="Facção envolvida (opcional)" htmlFor="d-faction">
        <NativeSelect id="d-faction" name="factionId" defaultValue={entry?.factionId ?? ""}>
          <option value="">Nenhuma</option>
          {factions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Detalhes (opcional)">
        <MarkdownEditor name="content" defaultValue={entry?.content ?? ""} rows={5} />
      </Field>
    </div>
  );
}
