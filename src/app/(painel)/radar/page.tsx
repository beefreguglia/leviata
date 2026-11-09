import Link from "next/link";
import { CheckCircle2Icon, ChevronRightIcon } from "@/components/icons";
import { requireViewer } from "@/lib/session";
import { loadRadar } from "@/lib/radar-data";
import { RADAR_DAYS } from "@/lib/radar";
import { fmtAgo } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { PresenceAvatar } from "@/components/presence-avatar";

export const metadata = { title: "Radar de inatividade" };

export default async function RadarPage() {
  await requireViewer("radar.ver");
  const rows = await loadRadar();

  return (
    <>
      <PageHeader
        title="Radar de inatividade"
        description={`Membros ativos há ${RADAR_DAYS} dias ou mais sem entregar farm nem responder presença. Quem avisou ausência ou acabou de entrar não aparece.`}
      />
      {rows.length === 0 ? (
        <EmptyState icon={CheckCircle2Icon} title="Ninguém parado" description="Todos os membros tiveram atividade recente." />
      ) : (
        <GroupedList header={`Parados · ${rows.length}`}>
          {rows.map(({ member, lastActivity, days }) => (
            <Link key={member.id} href={`/membros/${member.id}`} data-testid="radar-row" className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-white/5">
              <PresenceAvatar name={member.rpName} src={member.user?.avatarUrl} presence="ATIVO" size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base text-grey-100">{member.rpName}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {member.rank?.name ?? "Sem patente"} · {lastActivity ? `última atividade ${fmtAgo(lastActivity)}` : "nenhuma atividade desde que entrou"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-warning">
                {days} dias <ChevronRightIcon className="size-4 text-muted-foreground" />
              </span>
            </Link>
          ))}
        </GroupedList>
      )}
    </>
  );
}
