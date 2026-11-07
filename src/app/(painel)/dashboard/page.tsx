import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDaysIcon, ChevronRightIcon, ClockIcon, PackageIcon, RadioIcon, TargetIcon, UserXIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { allBalances } from "@/lib/vault";
import { weeklyGoals } from "@/lib/goals";
import { noticeInclude } from "@/lib/polls";
import { money } from "@/lib/finance";
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
        <span className="block type-stat text-grey-100">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const registered = Boolean(viewer.member?.passport && viewer.member?.phone);
  if (!viewer.can("painel.ver")) redirect(registered ? "/regras" : "/registro");

  const now = new Date();
  const canManage = viewer.can("ausencias.gerenciar");
  after(() => refreshStreamsIfStale().catch((err) => console.error("Falha ao atualizar lives:", err)));
  const canFinance = viewer.can("financeiro.gerenciar");
  const [activeCount, absentNow, pendingCount, recent, pinnedNotices, liveNow, nextEvents, balances, myGoals, pendingDeliveries] = await Promise.all([
    db.member.count({ where: { status: "ATIVO" } }),
    canManage
      ? db.absence.findMany({ where: activeAbsenceWhere(now), include: { member: true }, orderBy: { endsAt: "asc" } })
      : Promise.resolve([]),
    canManage ? db.absence.count({ where: { status: "PENDENTE", endsAt: { gte: now } } }) : Promise.resolve(0),
    viewer.can("auditoria.ver")
      ? db.auditLog.findMany({ include: { user: { include: { member: true } } }, orderBy: { createdAt: "desc" }, take: 6 })
      : Promise.resolve([]),
    db.notice.findMany({
      where: { AND: [{ OR: [{ isPinned: true }, { priority: "URGENTE" }] }, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] },
      include: noticeInclude(viewer.member?.id),
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
    canFinance ? allBalances() : Promise.resolve(null),
    viewer.member ? weeklyGoals(now, viewer.member.id) : Promise.resolve(null),
    canFinance ? db.vaultTransaction.count({ where: { status: "PENDENTE" } }) : Promise.resolve(0),
  ]);
  const myRow = myGoals?.rows[0];

  const firstName = (viewer.member?.rpName ?? viewer.user.username).split(" ")[0];

  return (
    <>
      {!registered && (
        <FadeIn className="mb-6">
          <Link
            href="/registro"
            data-testid="registro-pendente"
            className="flex items-center justify-between gap-3 rounded-card border-2 border-warning/40 bg-warning-low px-5 py-4 text-base text-grey-100 hover:border-warning"
          >
            <span>
              <strong>Falta seu registro.</strong> Informe nome, número e ID para a liderança te encontrar.
            </span>
            <ChevronRightIcon className="size-5 shrink-0" />
          </Link>
        </FadeIn>
      )}
      <FadeIn className="mb-10">
        <p className="mb-2 type-label text-muted-foreground">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now)}
        </p>
        <h1 className="type-h1 text-grey-100">
          {greeting()},{" "}
          {/* destaque grafitado (Permanent Marker) só no nome — ver docs/TIPOGRAFIA.md */}
          <span className="type-accent text-[0.82em] normal-case text-cyan-light">{firstName}</span>
        </h1>
      </FadeIn>

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <Stat label="Membros ativos" value={activeCount} icon={UsersIcon} href="/membros" />
        </StaggerItem>
        {canManage && (
          <StaggerItem>
            <Stat label="Fora agora" value={absentNow.length} icon={UserXIcon} href="/ausencias" tone="warning" />
          </StaggerItem>
        )}
        {canManage && (
          <StaggerItem>
            <Stat label="Aguardando aprovação" value={pendingCount} icon={ClockIcon} href="/ausencias" tone="warning" />
          </StaggerItem>
        )}
        {canFinance && (
          <StaggerItem>
            <Stat label="Entregas para conferir" value={pendingDeliveries} icon={PackageIcon} href="/bau" tone="warning" />
          </StaggerItem>
        )}
      </Stagger>

      {(balances || myRow?.hasGoals) && (
        <FadeIn delay={0.03} className="mt-10 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {balances && (
            <Link href="/bau" className="flex flex-col gap-3 rounded-card bg-card p-6 transition-colors hover:bg-grey-700" data-testid="dashboard-vault">
              <span className="flex items-center gap-2 text-sm font-bold text-grey-200">
                <WalletIcon className="size-4 text-primary" /> Baú
              </span>
              <span className="grid grid-cols-2 gap-4">
                <span>
                  <span className="block type-stat text-grey-100">{money(balances.dirty)}</span>
                  <span className="text-sm text-muted-foreground">sujo</span>
                </span>
                <span>
                  <span className="block type-stat text-grey-100">{money(balances.clean)}</span>
                  <span className="text-sm text-muted-foreground">limpo</span>
                </span>
              </span>
            </Link>
          )}
          {myRow?.hasGoals && (
            <Link href="/metas" className="flex flex-col gap-3 rounded-card bg-card p-6 transition-colors hover:bg-grey-700" data-testid="dashboard-goals">
              <span className="flex items-center justify-between text-sm font-bold text-grey-200">
                <span className="flex items-center gap-2">
                  <TargetIcon className="size-4 text-primary" /> Minhas metas da semana
                </span>
                {myRow.complete && <span className="text-success">✓ batidas</span>}
              </span>
              {myRow.cells.map((c) => {
                if (!c.applicable) return null;
                const item = myGoals!.items.find((i) => i.id === c.itemId)!;
                return (
                  <span key={c.itemId} className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-sm text-grey-200">
                      {item.name}
                      <span className="tabular-nums">
                        {c.done} / {c.target}
                      </span>
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full bg-grey-700">
                      <span className={`block h-full rounded-full ${c.complete ? "bg-success" : "bg-primary"}`} style={{ width: `${c.pct}%` }} />
                    </span>
                  </span>
                );
              })}
            </Link>
          )}
        </FadeIn>
      )}

      {pinnedNotices.length > 0 && (
        <FadeIn delay={0.05} className="mt-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="type-h2 text-grey-300">Mural</h2>
            <Link href="/mural" className="text-sm text-cyan-light hover:underline">Ver todos</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {pinnedNotices.map((n) => (
              <NoticeCard key={n.id} notice={n} compact />
            ))}
          </div>
        </FadeIn>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
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

{canManage && (
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
        )}

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
