import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { endOfDayBRT, fmtDayChip, fmtDayLong, fmtTime, shiftDay, startOfDayBRT, toDateInputBRT, toDateTimeInputBRT } from "@/lib/dates";
import { DIARY_KIND } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Stagger, StaggerItem } from "@/components/motion";
import { DiaryEntryFields } from "./entry-fields";
import { createDiaryEntry, deleteDiaryEntry, updateDiaryEntry } from "./actions";

export const metadata = { title: "Diário" };

const WEEK = 7;

export default async function DiarioPage({ searchParams }: PageProps<"/diario">) {
  const viewer = await requireViewer("diario.ver");
  const canCreate = viewer.can("diario.criar");
  const canEditOthers = viewer.can("diario.editar");
  const canDeleteOthers = viewer.can("diario.apagar");

  const today = toDateInputBRT(new Date());
  const sp = await searchParams;
  const raw = typeof sp.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : today;
  const day = raw > today ? today : raw;
  const isToday = day === today;
  const weekStart = shiftDay(day, -(WEEK - 1));

  const [entries, weekDates, factions] = await Promise.all([
    db.diaryEntry.findMany({
      where: { happenedAt: { gte: startOfDayBRT(day), lte: endOfDayBRT(day) } },
      include: { author: { select: { id: true, rpName: true } }, faction: { select: { id: true, name: true, color: true } } },
      orderBy: { happenedAt: "asc" },
    }),
    db.diaryEntry.findMany({ where: { happenedAt: { gte: startOfDayBRT(weekStart), lte: endOfDayBRT(day) } }, select: { happenedAt: true } }),
    canCreate || canEditOthers ? db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const counts = new Map<string, number>();
  for (const e of weekDates) {
    const k = toDateInputBRT(e.happenedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const strip = Array.from({ length: WEEK }, (_, i) => shiftDay(weekStart, i));
  // registro novo: agora (se for hoje) ou o meio da tarde do dia aberto
  const defaultWhen = isToday ? toDateTimeInputBRT(new Date()) : `${day}T15:00`;
  const href = (d: string) => (d === today ? "/diario" : `/diario?dia=${d}`);

  return (
    <>
      <PageHeader
        title="Diário"
        description="O que aconteceu na cidade, dia a dia."
        actions={
          canCreate && (
            <FormDialog
              title="Registrar acontecimento"
              size="lg"
              action={createDiaryEntry}
              submitLabel="Registrar"
              trigger={
                <Button>
                  <PlusIcon /> Registrar
                </Button>
              }
            >
              <DiaryEntryFields factions={factions} defaultWhen={defaultWhen} />
            </FormDialog>
          )
        }
      />

      <div className="flex flex-col gap-8">
        <nav aria-label="Escolher o dia" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href={href(shiftDay(day, -1))} variant="secondary" size="icon" aria-label="Dia anterior">
              <ChevronLeftIcon />
            </LinkButton>
            {isToday ? (
              <Button variant="secondary" size="icon" disabled aria-label="Próximo dia">
                <ChevronRightIcon />
              </Button>
            ) : (
              <LinkButton href={href(shiftDay(day, 1))} variant="secondary" size="icon" aria-label="Próximo dia">
                <ChevronRightIcon />
              </LinkButton>
            )}
            <form action="/diario" className="flex items-center gap-2">
              <Input type="date" name="dia" defaultValue={day} max={today} aria-label="Ir para o dia" className="w-auto" />
              <Button type="submit" variant="secondary">
                Ir
              </Button>
            </form>
            {!isToday && (
              <LinkButton href="/diario" variant="ghost">
                Hoje
              </LinkButton>
            )}
          </div>
          <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" data-testid="diary-week">
            {strip.map((d) => {
              const chip = fmtDayChip(d);
              const n = counts.get(d) ?? 0;
              const active = d === day;
              return (
                <li key={d}>
                  <Link
                    href={href(d)}
                    aria-current={active ? "date" : undefined}
                    aria-label={`${fmtDayLong(d)}: ${n} ${n === 1 ? "registro" : "registros"}`}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md text-center transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-grey-800 text-grey-200 hover:bg-grey-700",
                    )}
                  >
                    <span className={cn("text-xs capitalize", active ? "opacity-80" : "text-muted-foreground")}>{chip.weekday.replace(".", "")}</span>
                    <span className="text-lg font-bold tabular-nums">{chip.day}</span>
                    <span className={cn("size-1.5 rounded-full", n > 0 ? (active ? "bg-primary-foreground" : "bg-cyan-light") : "bg-transparent")} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="flex flex-col gap-4">
          <h2 className="type-h2 text-balance text-grey-300 first-letter:uppercase">
            {isToday ? "Hoje · " : ""}
            {fmtDayLong(day)}
            <span className="text-muted-foreground tabular-nums"> · {entries.length}</span>
          </h2>

          {entries.length === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title={isToday ? "Nada registrado hoje" : "Nada registrado neste dia"}
              description={canCreate ? "Aconteceu algo? Registre para a fac ficar sabendo." : undefined}
            />
          ) : (
            <Stagger className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[3.25rem] before:w-px before:bg-grey-700 max-sm:before:hidden">
              {entries.map((e) => {
                const own = e.authorId != null && e.authorId === viewer.member?.id;
                const canEdit = own ? canCreate : canEditOthers;
                const canDelete = own ? canCreate : canDeleteOthers;
                return (
                  <StaggerItem key={e.id}>
                    <article data-testid="diary-entry" className="flex gap-4">
                      <time dateTime={e.happenedAt.toISOString()} className="relative w-11 shrink-0 pt-5 text-right text-sm font-bold tabular-nums text-cyan-light max-sm:hidden">
                        {fmtTime(e.happenedAt)}
                      </time>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-card glass-card p-5">
                        <header className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold tabular-nums text-cyan-light sm:hidden">{fmtTime(e.happenedAt)}</span>
                              <StatusBadge {...DIARY_KIND[e.kind]} />
                              {e.faction && (
                                <Link href={`/faccoes/${e.faction.id}`} className="inline-flex h-6 items-center gap-1.5 rounded-full bg-grey-700 px-2.5 text-xs text-grey-100 hover:bg-grey-600">
                                  <span className="size-2 rounded-full" style={{ background: e.faction.color }} aria-hidden />
                                  {e.faction.name}
                                </Link>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-balance text-grey-100">{e.title}</h3>
                          </div>
                          {(canEdit || canDelete) && (
                            <div className="flex shrink-0">
                              {canEdit && (
                                <FormDialog
                                  title="Editar registro"
                                  size="lg"
                                  action={updateDiaryEntry.bind(null, e.id)}
                                  trigger={
                                    <Button variant="ghost" size="icon-sm" aria-label={`Editar "${e.title}"`}>
                                      <PencilIcon />
                                    </Button>
                                  }
                                >
                                  <DiaryEntryFields entry={e} factions={factions} defaultWhen={defaultWhen} />
                                </FormDialog>
                              )}
                              {canDelete && (
                                <ConfirmButton
                                  title="Apagar este registro?"
                                  description={e.title}
                                  confirmLabel="Apagar"
                                  destructive
                                  action={deleteDiaryEntry.bind(null, e.id)}
                                  trigger={
                                    <Button variant="ghost" size="icon-sm" aria-label={`Apagar "${e.title}"`}>
                                      <Trash2Icon />
                                    </Button>
                                  }
                                />
                              )}
                            </div>
                          )}
                        </header>
                        {e.content && <Markdown>{e.content}</Markdown>}
                        <p className="text-xs text-muted-foreground">por {e.author?.rpName ?? "membro desligado"}</p>
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>
      </div>
    </>
  );
}
