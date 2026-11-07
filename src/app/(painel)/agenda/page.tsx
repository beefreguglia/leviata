import Link from "next/link";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { EVENT_KIND, EVENT_STATUS, ATTENDANCE } from "@/lib/labels";
import { fmtTime, fmtWeekday, toDateInputBRT } from "@/lib/dates";
import { MONTH_NAMES, WEEKDAYS, groupByDay, monthGrid, monthKey, monthRange, parseMonth, shiftMonth } from "@/lib/agenda";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";
import { EventFields } from "./event-fields";
import { createEvent } from "./actions";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const viewer = await requireViewer();
  const canManage = viewer.can("operacoes.gerenciar");
  const sp = await searchParams;
  const [y, m] = parseMonth(typeof sp.mes === "string" ? sp.mes : null);
  const { from, to } = monthRange(y, m);
  const now = new Date();

  const [monthEvents, upcoming, perimeters] = await Promise.all([
    db.event.findMany({ where: { startsAt: { gte: from, lte: to } }, orderBy: { startsAt: "asc" } }),
    db.event.findMany({
      where: { startsAt: { gte: new Date(now.getTime() - 3 * 3600_000) }, status: "AGENDADO" },
      include: {
        attendances: { where: { memberId: viewer.member?.id ?? "-" } },
        _count: { select: { attendances: { where: { status: "VOU" } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    canManage ? db.perimeter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const byDay = groupByDay(monthEvents);
  const [py, pm] = shiftMonth(y, m, -1);
  const [ny, nm] = shiftMonth(y, m, 1);
  const presetPerimeter = typeof sp.perimetro === "string" ? sp.perimetro : undefined;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Ações, corridas, reuniões e treinos da Leviata."
        actions={
          canManage && (
            <FormDialog
              title="Novo evento"
              size="lg"
              action={createEvent}
              submitLabel="Agendar"
              defaultOpen={sp.novo === "1"}
              trigger={
                <Button>
                  <PlusIcon /> Novo evento
                </Button>
              }
            >
              <EventFields perimeters={perimeters} defaultPerimeterId={presetPerimeter} />
            </FormDialog>
          )
        }
      />

      <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
        <FadeIn className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold capitalize text-grey-100" data-testid="calendar-month">
              {MONTH_NAMES[m - 1]} {y}
            </h2>
            <div className="flex items-center gap-1">
              <LinkButton href={`/agenda?mes=${monthKey(py, pm)}`} variant="ghost" size="icon" aria-label="Mês anterior">
                <ChevronLeftIcon />
              </LinkButton>
              <LinkButton href="/agenda" variant="ghost" size="sm">
                Hoje
              </LinkButton>
              <LinkButton href={`/agenda?mes=${monthKey(ny, nm)}`} variant="ghost" size="icon" aria-label="Próximo mês">
                <ChevronRightIcon />
              </LinkButton>
            </div>
          </div>
          <div className="overflow-hidden rounded-card bg-card" role="grid" aria-label="Calendário">
            <div className="grid grid-cols-7 border-b border-grey-700" role="row">
              {WEEKDAYS.map((d) => (
                <div key={d} role="columnheader" className="px-2 py-3 text-center text-xs font-bold text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {monthGrid(y, m).map((week) => (
              <div key={week[0].key} className="grid grid-cols-7 border-b border-grey-700 last:border-b-0" role="row">
                {week.map((d) => {
                  const evs = byDay.get(d.key) ?? [];
                  return (
                    <div
                      key={d.key}
                      role="gridcell"
                      data-day={d.key}
                      className={cn("flex min-h-24 flex-col gap-1 border-r border-grey-700 p-1.5 last:border-r-0 sm:min-h-28", !d.inMonth && "bg-grey-900/40")}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center self-end rounded-full text-xs tabular-nums",
                          d.isToday ? "bg-primary font-bold text-primary-foreground" : d.inMonth ? "text-grey-200" : "text-grey-500",
                        )}
                      >
                        {d.day}
                      </span>
                      {evs.slice(0, 3).map((e) => (
                        <Link
                          key={e.id}
                          href={`/agenda/${e.id}`}
                          title={`${fmtTime(e.startsAt)} · ${e.title}`}
                          className={cn(
                            "flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] font-medium hover:brightness-125",
                            EVENT_KIND[e.kind].className,
                            e.status === "CANCELADO" && "line-through opacity-50",
                          )}
                        >
                          <span className="hidden tabular-nums sm:inline">{fmtTime(e.startsAt)}</span>
                          <span className="truncate">{e.title}</span>
                        </Link>
                      ))}
                      {evs.length > 3 && <span className="px-1.5 text-[11px] text-muted-foreground">+{evs.length - 3}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {Object.values(EVENT_KIND).map((k) => (
              <span key={k.label} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", k.dot)} /> {k.label}
              </span>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDaysIcon} title="Nada agendado" description={canManage ? "Crie o primeiro evento no botão acima." : "Quando a liderança marcar algo, aparece aqui."} />
          ) : (
            <GroupedList header="Próximos">
              {upcoming.map((e) => {
                const mine = e.attendances[0];
                return (
                  <Link key={e.id} href={`/agenda/${e.id}`} data-testid="upcoming-event" className="flex flex-col gap-1.5 px-5 py-4 hover:bg-grey-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground first-letter:uppercase">
                        {toDateInputBRT(e.startsAt) === toDateInputBRT(now) ? "Hoje" : fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                      </span>
                      <StatusBadge {...EVENT_KIND[e.kind]} />
                    </div>
                    <span className="text-base font-medium text-grey-100">{e.title}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {e._count.attendances} confirmados
                      {mine ? <StatusBadge {...ATTENDANCE[mine.status]} /> : <span className="text-warning">· você ainda não respondeu</span>}
                      {e.status !== "AGENDADO" && <StatusBadge {...EVENT_STATUS[e.status]} />}
                    </span>
                  </Link>
                );
              })}
            </GroupedList>
          )}
        </FadeIn>
      </div>
    </>
  );
}
