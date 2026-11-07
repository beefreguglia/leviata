import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/fields";
import { EVENT_KIND } from "@/lib/labels";
import { toDateTimeInputBRT } from "@/lib/dates";
import type { Event } from "@/generated/prisma/client";

export function EventFields({
  event,
  perimeters,
  defaultPerimeterId,
  defaultStart,
}: {
  event?: Event;
  perimeters: { id: string; name: string }[];
  defaultPerimeterId?: string;
  defaultStart?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Field label="Título" htmlFor="ev-title">
          <Input id="ev-title" name="title" required defaultValue={event?.title} placeholder="Ex.: Fleeca da Praça" />
        </Field>
        <Field label="Tipo" htmlFor="ev-kind">
          <NativeSelect id="ev-kind" name="kind" defaultValue={event?.kind ?? (defaultPerimeterId ? "ACAO" : "ACAO")}>
            {Object.entries(EVENT_KIND).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Começa" htmlFor="ev-start">
          <Input id="ev-start" name="startsAt" type="datetime-local" required defaultValue={event ? toDateTimeInputBRT(event.startsAt) : defaultStart} />
        </Field>
        <Field label="Termina (opcional)" htmlFor="ev-end">
          <Input id="ev-end" name="endsAt" type="datetime-local" defaultValue={toDateTimeInputBRT(event?.endsAt)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Local" htmlFor="ev-location">
          <Input id="ev-location" name="location" defaultValue={event?.location ?? ""} placeholder="Ex.: Ponto de encontro no porto" />
        </Field>
        <Field label="Perímetro (para ações)" htmlFor="ev-perimeter">
          <NativeSelect id="ev-perimeter" name="perimeterId" defaultValue={event?.perimeterId ?? defaultPerimeterId ?? ""}>
            <option value="">Nenhum</option>
            {perimeters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Detalhes" htmlFor="ev-desc">
        <Textarea id="ev-desc" name="description" rows={3} defaultValue={event?.description ?? ""} />
      </Field>
      {!event && (
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
          Avisar no Discord
          <input type="checkbox" name="notifyDiscord" defaultChecked className="size-5 accent-[var(--primary)]" />
        </label>
      )}
    </div>
  );
}
