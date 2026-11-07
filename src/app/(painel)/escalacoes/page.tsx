import Link from "next/link";
import { CarIcon, ClipboardListIcon, TriangleAlertIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { EVENT_KIND } from "@/lib/labels";
import { fmtTime, fmtWeekday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { StatusBadge } from "@/components/status-badge";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Escalações" };

export default async function EscalacoesPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("operacoes.gerenciar");
  const now = new Date();
  const since = new Date(now.getTime() - 3 * 3600_000);

  const events = await db.event.findMany({
    where: { status: "AGENDADO", startsAt: { gte: since } },
    include: { slots: { include: { member: true }, orderBy: { order: "asc" } }, perimeter: true },
    orderBy: { startsAt: "asc" },
  });
  const withLineup = events.filter((e) => e.slots.length > 0);
  const withoutLineup = events.filter((e) => e.slots.length === 0 && (e.kind === "ACAO" || e.perimeterId));
  const mine = withLineup.flatMap((e) => e.slots.filter((s) => s.memberId === viewer.member?.id).map((s) => ({ e, s })));

  return (
    <>
      <PageHeader title="Escalações" description="Quem vai em cada função nas próximas ações." />

      <div className="flex flex-col gap-10">
        <GroupedList header="Minhas escalações">
          {mine.length === 0 ? (
            <p className="px-5 py-4 text-base text-muted-foreground">Você não está escalado em nada por enquanto.</p>
          ) : (
            mine.map(({ e, s }) => (
              <Link key={s.id} href={`/agenda/${e.id}`} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 hover:bg-grey-700" data-testid="my-lineup">
                <span className="flex flex-col">
                  <span className="text-base font-medium text-grey-100">{e.title}</span>
                  <span className="text-sm text-muted-foreground first-letter:uppercase">
                    {fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {s.vehicle && (
                    <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
                      <CarIcon className="size-4" /> {s.vehicle}
                    </span>
                  )}
                  <StatusBadge label={s.role} className="bg-cyan-low text-cyan-light" />
                </span>
              </Link>
            ))
          )}
        </GroupedList>

        {canManage && withoutLineup.length > 0 && (
          <GroupedList header="Sem escalação ainda" footer="Ações agendadas que ainda não têm ninguém escalado.">
            {withoutLineup.map((e) => (
              <Link key={e.id} href={`/agenda/${e.id}`} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 hover:bg-grey-700">
                <span className="flex items-center gap-2 text-base text-grey-100">
                  <TriangleAlertIcon className="size-4 text-warning" /> {e.title}
                </span>
                <span className="text-sm text-muted-foreground first-letter:uppercase">
                  {fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                </span>
              </Link>
            ))}
          </GroupedList>
        )}

        {withLineup.length === 0 ? (
          <EmptyState icon={ClipboardListIcon} title="Nenhuma escalação montada" description="As escalações das próximas ações aparecem aqui." />
        ) : (
          <Stagger className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {withLineup.map((e) => {
              const filled = e.slots.filter((s) => s.member).length;
              return (
                <StaggerItem key={e.id}>
                  <article className="flex h-full flex-col gap-4 rounded-card bg-card p-5" data-testid="lineup-card">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/agenda/${e.id}`} className="text-lg font-bold text-grey-100 hover:underline">
                          {e.title}
                        </Link>
                        <p className="text-sm text-muted-foreground first-letter:uppercase">
                          {fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                          {e.perimeter && ` · ${e.perimeter.name}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge {...EVENT_KIND[e.kind]} />
                        <span className={cn("text-xs tabular-nums", filled < e.slots.length ? "text-warning" : "text-success")}>
                          {filled}/{e.slots.length} vagas
                        </span>
                      </div>
                    </header>
                    <ul className="flex flex-col gap-1.5">
                      {e.slots.map((s) => (
                        <li key={s.id} className={cn("flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm", s.memberId === viewer.member?.id ? "bg-cyan-low" : "bg-grey-900/50")}>
                          <span className="font-medium text-grey-200">{s.role}</span>
                          <span className={s.member ? "text-grey-100" : "text-muted-foreground italic"}>
                            {s.member?.rpName ?? "vaga aberta"}
                            {s.vehicle && <span className="text-muted-foreground"> · {s.vehicle}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {!e.lineupPublishedAt && <p className="text-xs text-warning">Rascunho — ainda não publicada no Discord</p>}
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </>
  );
}
