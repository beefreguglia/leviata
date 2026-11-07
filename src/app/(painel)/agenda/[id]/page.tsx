import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BanIcon, CalendarIcon, CarIcon, CheckIcon, ClipboardListIcon, FileTextIcon, MapPinIcon, PencilIcon, RotateCcwIcon,
  SendIcon, TargetIcon, Trash2Icon, WandSparklesIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { unavailableMembers } from "@/lib/availability";
import { ATTENDANCE, EVENT_KIND, EVENT_RESULT, EVENT_STATUS } from "@/lib/labels";
import { fmtAgo, fmtDateTime, fmtTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { GroupedList, GroupedRow } from "@/components/layout/grouped-list";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { PresenceAvatar } from "@/components/presence-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/motion";
import { EventFields } from "../event-fields";
import { LineupEditor } from "../lineup-editor";
import {
  deleteEvent, generateLineup, publishLineup, saveLineup, saveReport, setAttendance, setEventStatus, updateEvent,
} from "../actions";

export async function generateMetadata({ params }: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  const ev = await db.event.findUnique({ where: { id }, select: { title: true } });
  return { title: ev?.title ?? "Evento" };
}

export default async function EventPage({ params }: PageProps<"/agenda/[id]">) {
  const viewer = await requireViewer();
  const canManage = viewer.can("operacoes.gerenciar");
  const { id } = await params;
  const ev = await db.event.findUnique({
    where: { id },
    include: {
      perimeter: { include: { roles: true } },
      createdBy: true,
      attendances: { include: { member: { include: { rank: true, user: true } } }, orderBy: { updatedAt: "asc" } },
      slots: { include: { member: { include: { user: true } } }, orderBy: { order: "asc" } },
      report: { include: { author: true } },
    },
  });
  if (!ev) notFound();

  const now = new Date();
  const started = ev.startsAt <= now;
  const open = ev.status === "AGENDADO";
  const mine = ev.attendances.find((a) => a.memberId === viewer.member?.id);
  const mySlots = ev.slots.filter((s) => s.memberId && s.memberId === viewer.member?.id);
  const byStatus = (st: "VOU" | "TALVEZ" | "NAO_VOU") => ev.attendances.filter((a) => a.status === st);

  const [perimeters, members, unavailable] = canManage
    ? await Promise.all([
        db.perimeter.findMany({ select: { id: true, name: true, target: true }, orderBy: { target: "asc" } }),
        db.member.findMany({ where: { status: { not: "EXPULSO" } }, include: { rank: true }, orderBy: { rpName: "asc" } }),
        unavailableMembers(ev.startsAt),
      ])
    : [[], [], new Map<string, string>()];
  const attMap = new Map(ev.attendances.map((a) => [a.memberId, a.status]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge {...EVENT_KIND[ev.kind]} />
            <StatusBadge {...EVENT_STATUS[ev.status]} />
            {ev.lineupPublishedAt && <StatusBadge label="Escalação publicada" className="bg-cyan-low text-cyan-light" />}
          </div>
          <h1 className={cn("text-2xl font-bold leading-shorter text-grey-100 md:text-[2rem]", ev.status === "CANCELADO" && "line-through opacity-60")}>{ev.title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey-300">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-4 text-muted-foreground" /> {fmtDateTime(ev.startsAt)}
              {ev.endsAt && ` – ${fmtTime(ev.endsAt)}`}
            </span>
            {ev.location && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="size-4 text-muted-foreground" /> {ev.location}
              </span>
            )}
            {ev.perimeter && (
              <Link href={`/perimetros/${ev.perimeter.id}`} className="flex items-center gap-1.5 text-cyan-light hover:underline">
                <TargetIcon className="size-4" /> {ev.perimeter.target} — {ev.perimeter.name}
              </Link>
            )}
          </div>
          {ev.description && <p className="max-w-2xl text-base whitespace-pre-wrap text-grey-300">{ev.description}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
            <FormDialog
              title="Editar evento"
              size="lg"
              action={updateEvent.bind(null, ev.id)}
              trigger={
                <Button variant="secondary">
                  <PencilIcon /> Editar
                </Button>
              }
            >
              <EventFields event={ev} perimeters={perimeters} />
            </FormDialog>
            {open ? (
              <ConfirmButton
                title={`Cancelar "${ev.title}"?`}
                description="O Discord é avisado."
                confirmLabel="Cancelar evento"
                destructive
                action={setEventStatus.bind(null, ev.id, "CANCELADO")}
                trigger={
                  <Button variant="ghost">
                    <BanIcon /> Cancelar
                  </Button>
                }
              />
            ) : (
              <ActionForm action={async () => { "use server"; return setEventStatus(ev.id, "AGENDADO"); }}>
                <SubmitButton variant="ghost">
                  <RotateCcwIcon /> Reabrir
                </SubmitButton>
              </ActionForm>
            )}
            <ConfirmButton
              title={`Apagar "${ev.title}"?`}
              description="Presenças, escalação e relatório também serão apagados."
              confirmLabel="Apagar"
              destructive
              action={deleteEvent.bind(null, ev.id)}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Apagar evento">
                  <Trash2Icon />
                </Button>
              }
            />
          </div>
        )}
      </FadeIn>

      {mySlots.length > 0 && (
        <p className="flex items-center gap-3 rounded-card bg-cyan-low px-5 py-4 text-base text-cyan-light" data-testid="my-slot">
          <ClipboardListIcon className="size-5 shrink-0" />
          Você está escalado como <strong>{mySlots.map((s) => s.role).join(" e ")}</strong>
          {mySlots[0].vehicle && <> · veículo <strong>{mySlots[0].vehicle}</strong></>}
        </p>
      )}

      {/* Presença */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-grey-200">Presença</h2>
        {open && viewer.member && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Minha presença">
            {(["VOU", "TALVEZ", "NAO_VOU"] as const).map((st) => (
              <ActionForm key={st} action={async () => { "use server"; return setAttendance(ev.id, st); }}>
                <SubmitButton
                  variant={mine?.status === st ? "default" : "secondary"}
                  className={cn(mine?.status === st && st === "NAO_VOU" && "bg-danger-light text-grey-950 hover:bg-danger-light/80")}
                >
                  {mine?.status === st && <CheckIcon />}
                  {ATTENDANCE[st].label}
                </SubmitButton>
              </ActionForm>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {(["VOU", "TALVEZ", "NAO_VOU"] as const).map((st) => {
            const list = byStatus(st);
            return (
              <div key={st} className="flex flex-col gap-2 rounded-card bg-card p-4" data-testid={`attendance-${st}`}>
                <span className="flex items-center justify-between text-sm font-bold text-grey-200">
                  {ATTENDANCE[st].label} <span className="tabular-nums text-muted-foreground">{list.length}</span>
                </span>
                {list.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Ninguém</span>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm text-grey-100">
                        <PresenceAvatar name={a.member.rpName} src={a.member.user?.avatarUrl} presence="ATIVO" size="sm" />
                        {a.member.rpName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Escalação */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-grey-200">
            Escalação {ev.lineupPublishedAt && <span className="font-normal text-muted-foreground">· publicada {fmtAgo(ev.lineupPublishedAt)}</span>}
          </h2>
          {canManage && open && (
            <div className="flex flex-wrap gap-2">
              {ev.perimeter && (
                <ActionForm action={async () => { "use server"; return generateLineup(ev.id); }}>
                  <SubmitButton variant="secondary" size="sm">
                    <WandSparklesIcon /> Gerar pelo perímetro
                  </SubmitButton>
                </ActionForm>
              )}
              {ev.slots.length > 0 && (
                <ActionForm action={async () => { "use server"; return publishLineup(ev.id); }}>
                  <SubmitButton size="sm">
                    <SendIcon /> {ev.lineupPublishedAt ? "Publicar de novo" : "Publicar no Discord"}
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          )}
        </div>
        {canManage && open ? (
          <div className="rounded-card bg-card p-5">
            <LineupEditor
              version={ev.slots.map((s) => s.id).join()}
              action={saveLineup.bind(null, ev.id)}
              slots={ev.slots}
              members={members.map((m) => ({
                id: m.id,
                name: m.rpName,
                rank: m.rank?.name ?? null,
                attendance: attMap.get(m.id) ?? null,
                unavailable: unavailable.get(m.id) ?? null,
              }))}
            />
          </div>
        ) : ev.slots.length === 0 ? (
          <p className="rounded-card bg-card px-5 py-5 text-base text-muted-foreground">Escalação ainda não montada.</p>
        ) : (
          <GroupedList>
            {ev.slots.map((s) => (
              <div key={s.id} className={cn("flex min-h-14 items-center justify-between gap-3 px-5 py-3", s.memberId === viewer.member?.id && "bg-cyan-low/60")} data-testid="lineup-slot">
                <span className="text-base font-medium text-grey-100">{s.role}</span>
                <span className="flex items-center gap-3 text-right text-sm">
                  {s.vehicle && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CarIcon className="size-4" /> {s.vehicle}
                    </span>
                  )}
                  <span className={s.member ? "text-grey-100" : "text-muted-foreground italic"}>{s.member?.rpName ?? "vaga aberta"}</span>
                </span>
              </div>
            ))}
          </GroupedList>
        )}
      </section>

      {/* Relatório */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-grey-200">
          <FileTextIcon className="size-4" /> Relatório
        </h2>
        {ev.report && (
          <GroupedList footer={`Por ${ev.report.author?.rpName ?? "—"} · ${fmtAgo(ev.report.updatedAt)}`}>
            <GroupedRow label="Resultado">
              <StatusBadge {...EVENT_RESULT[ev.report.result]} />
            </GroupedRow>
            {ev.report.loot && <GroupedRow label="Loot">{ev.report.loot}</GroupedRow>}
            {ev.report.money != null && <GroupedRow label="Dinheiro">R$ {ev.report.money.toLocaleString("pt-BR")}</GroupedRow>}
            <GroupedRow label="Baixas / presos">
              {ev.report.casualties ?? 0} / {ev.report.arrests ?? 0}
            </GroupedRow>
            {ev.report.notes && <p className="px-5 py-4 text-base whitespace-pre-wrap text-grey-300">{ev.report.notes}</p>}
          </GroupedList>
        )}
        {canManage && started && ev.status !== "CANCELADO" ? (
          <FormDialog
            title={ev.report ? "Editar relatório" : "Relatório da ação"}
            action={saveReport.bind(null, ev.id)}
            submitLabel="Salvar relatório"
            trigger={
              <Button variant={ev.report ? "secondary" : "default"} className="self-start">
                <FileTextIcon /> {ev.report ? "Editar relatório" : "Escrever relatório"}
              </Button>
            }
          >
            <Field label="Resultado" htmlFor="rp-result">
              <NativeSelect id="rp-result" name="result" defaultValue={ev.report?.result ?? "SUCESSO"}>
                {Object.entries(EVENT_RESULT).map(([v, { label }]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Loot" htmlFor="rp-loot">
              <Input id="rp-loot" name="loot" defaultValue={ev.report?.loot ?? ""} placeholder="Ex.: 3 malotes, 2 armas" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Dinheiro" htmlFor="rp-money">
                <Input id="rp-money" name="money" type="number" min={0} defaultValue={ev.report?.money ?? ""} />
              </Field>
              <Field label="Baixas" htmlFor="rp-cas">
                <Input id="rp-cas" name="casualties" type="number" min={0} defaultValue={ev.report?.casualties ?? ""} />
              </Field>
              <Field label="Presos" htmlFor="rp-arr">
                <Input id="rp-arr" name="arrests" type="number" min={0} defaultValue={ev.report?.arrests ?? ""} />
              </Field>
            </div>
            <Field label="O que aconteceu" htmlFor="rp-notes">
              <Textarea id="rp-notes" name="notes" rows={4} defaultValue={ev.report?.notes ?? ""} />
            </Field>
          </FormDialog>
        ) : (
          !ev.report && <p className="rounded-card bg-card px-5 py-5 text-base text-muted-foreground">{started ? "Sem relatório." : "O relatório é feito depois que o evento começar."}</p>
        )}
      </section>
    </div>
  );
}
