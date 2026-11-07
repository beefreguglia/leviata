import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDaysIcon, ChevronRightIcon, ClockIcon, RadioIcon, UserXIcon, UsersIcon } from "lucide-react";
import { after } from "next/server";
import { refreshStreamsIfStale } from "@/lib/stream-refresh";
import { ATTENDANCE, STREAM_PLATFORM } from "@/lib/labels";
import { StatusBadge } from "@/components/status-badge";
import { STREAM_URL } from "@/lib/streams";
import { NoticeCard } from "../mural/notice-card";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { activeAbsenceWhere } from "@/lib/absences";
import { fmtAgo, fmtDate, fmtTime, fmtWeekday } from "@/lib/dates";
import { GroupedList } from "@/components/layout/grouped-list";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Início" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone?: "primary" | "warning";
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-5 rounded-card bg-card p-6 transition-colors hover:bg-grey-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className={`flex size-10 items-center justify-center rounded-md ${tone === "warning" ? "bg-warning-low text-warning" : "bg-cyan-low text-cyan-light"}`}
      >
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-[2rem] font-bold leading-shorter text-grey-100 tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.can("painel.ver")) redirect("/regras");

  const now = new Date();
  const canManage = viewer.can("ausencias.gerenciar");
  after(() => refreshStreamsIfStale().catch((err) => console.error("Falha ao atualizar lives:", err)));
  const [activeCount, absentNow, pendingCount, recent, pinnedNotices, liveNow, nextEvents] = await Promise.all([
    db.member.count({ where: { status: "ATIVO" } }),
    db.absence.findMany({ where: activeAbsenceWhere(now), include: { member: true }, orderBy: { endsAt: "asc" } }),
    canManage ? db.absence.count({ where: { status: "PENDENTE", endsAt: { gte: now } } }) : Promise.resolve(0),
    viewer.can("auditoria.ver")
      ? db.auditLog.findMany({ include: { user: { include: { member: true } } }, orderBy: { createdAt: "desc" }, take: 6 })
      : Promise.resolve([]),
    db.notice.findMany({
      where: { AND: [{ OR: [{ isPinned: true }, { priority: "URGENTE" }] }, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] },
      include: { author: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    db.streamChannel.findMany({ where: { isLive: true }, include: { member: true }, orderBy: { viewers: { sort: "desc", nulls: "last" } } }),
    db.event.findMany({
      where: { status: "AGENDADO", startsAt: { gte: new Date(now.getTime() - 3 * 3600_000) } },
      include: {
        attendances: { where: { memberId: viewer.member?.id ?? "-" } },
        slots: { where: { memberId: viewer.member?.id ?? "-" } },
      },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
  ]);

  const firstName = (viewer.member?.rpName ?? viewer.user.username).split(" ")[0];

  return (
    <>
      <FadeIn className="mb-10">
        <p className="mb-2 text-sm font-medium text-muted-foreground first-letter:uppercase">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now)}
        </p>
        <h1 className="text-2xl font-bold leading-shorter md:text-[2rem]">
          {greeting()}, {firstName}
        </h1>
      </FadeIn>

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <Stat label="Membros ativos" value={activeCount} icon={UsersIcon} href="/membros" />
        </StaggerItem>
        <StaggerItem>
          <Stat label="Fora agora" value={absentNow.length} icon={UserXIcon} href="/ausencias" tone="warning" />
        </StaggerItem>
        {canManage && (
          <StaggerItem>
            <Stat label="Aguardando aprovação" value={pendingCount} icon={ClockIcon} href="/ausencias" tone="warning" />
          </StaggerItem>
        )}
      </Stagger>

      {pinnedNotices.length > 0 && (
        <FadeIn delay={0.05} className="mt-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-grey-200">Mural</h2>
            <Link href="/mural" className="text-sm text-cyan-light hover:underline">Ver todos</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {pinnedNotices.map((n) => (
              <NoticeCard key={n.id} notice={n} compact />
            ))}
          </div>
        </FadeIn>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <GroupedList header="Próximas ações e corridas">
            {nextEvents.length === 0 ? (
              <Link href="/agenda" className="flex items-center gap-3 px-5 py-5 text-base text-muted-foreground hover:bg-grey-700">
                <CalendarDaysIcon className="size-5" /> Nada agendado ainda
              </Link>
            ) : (
              nextEvents.map((e) => (
                <Link key={e.id} href={`/agenda/${e.id}`} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 hover:bg-grey-700" data-testid="dashboard-event">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base text-grey-100">{e.title}</span>
                    <span className="text-sm text-muted-foreground first-letter:uppercase">
                      {fmtWeekday(e.startsAt)} · {fmtTime(e.startsAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {e.slots[0] && <StatusBadge label={e.slots[0].role} className="bg-cyan-low text-cyan-light" />}
                    {e.attendances[0] ? <StatusBadge {...ATTENDANCE[e.attendances[0].status]} /> : <StatusBadge label="Responder" className="bg-warning-low text-warning" />}
                  </span>
                </Link>
              ))
            )}
          </GroupedList>
        </FadeIn>

        <FadeIn delay={0.15}>
          <GroupedList header="Fora agora">
            {absentNow.length === 0 ? (
              <p className="px-5 py-4 text-base text-muted-foreground">Todo mundo na ativa.</p>
            ) : (
              absentNow.map((a) => (
                <Link
                  key={a.id}
                  href={`/membros/${a.member.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-5 py-4 text-base hover:bg-grey-700"
                >
                  <span className="truncate">{a.member.rpName}</span>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    volta {fmtDate(a.endsAt)} <ChevronRightIcon className="size-4" />
                  </span>
                </Link>
              ))
            )}
          </GroupedList>
        </FadeIn>

        <FadeIn delay={0.18}>
          <GroupedList header={`Ao vivo agora · ${liveNow.length}`}>
            {liveNow.length === 0 ? (
              <Link href="/lives" className="flex items-center gap-3 px-5 py-5 text-base text-muted-foreground hover:bg-grey-700">
                <RadioIcon className="size-5" /> Ninguém em live agora
              </Link>
            ) : (
              liveNow.map((c) => (
                <a
                  key={c.id}
                  href={STREAM_URL[c.platform](c.handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center justify-between gap-3 px-5 py-4 text-base hover:bg-grey-700"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger-light" />
                    <span className="truncate">{c.member.rpName}</span>
                    <span className="truncate text-sm text-muted-foreground">{c.title}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {STREAM_PLATFORM[c.platform].label}
                    {c.viewers != null && ` · ${c.viewers}`}
                  </span>
                </a>
              ))
            )}
          </GroupedList>
        </FadeIn>

        {recent.length > 0 && (
          <FadeIn delay={0.2} className="lg:col-span-2">
            <GroupedList header="Atividade recente">
              {recent.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <p className="min-w-0 truncate text-base">
                    <span className="font-medium">{log.user?.member?.rpName ?? log.user?.username ?? "Sistema"}</span>{" "}
                    <span className="text-muted-foreground">· {log.summary}</span>
                  </p>
                  <span className="shrink-0 text-sm text-muted-foreground">{fmtAgo(log.createdAt)}</span>
                </div>
              ))}
              <Link href="/auditoria" className="flex min-h-12 items-center px-4 text-base text-primary hover:underline">
                Ver tudo
              </Link>
            </GroupedList>
          </FadeIn>
        )}
      </div>
    </>
  );
}
