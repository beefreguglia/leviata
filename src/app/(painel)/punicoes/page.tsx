import { GavelIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { activePunishmentWhere } from "@/lib/punishments";
import { WARNING_LIMIT } from "@/lib/schemas/finance";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import { PunishmentFields } from "./punishment-fields";
import { PunishmentRows } from "./punishment-list";
import { createPunishment } from "./actions";

export const metadata = { title: "Punições" };

export default async function PunicoesPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("punicoes.gerenciar");
  const now = new Date();
  const include = { member: true, createdBy: true } as const;

  const [rows, warnings, members, ranks] = await Promise.all([
    db.punishment.findMany({
      where: canManage ? {} : { memberId: viewer.member?.id ?? "-" },
      include,
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    canManage
      ? db.punishment.groupBy({ by: ["memberId"], where: { kind: "ADVERTENCIA", ...activePunishmentWhere(now) }, _count: true })
      : Promise.resolve([]),
    canManage ? db.member.findMany({ where: { status: { not: "EXPULSO" } }, include: { rank: true }, orderBy: { rpName: "asc" } }) : Promise.resolve([]),
    canManage ? db.rank.findMany({ orderBy: { order: "asc" } }) : Promise.resolve([]),
  ]);
  const warnCount = new Map(warnings.map((w) => [w.memberId, w._count]));
  const atLimit = members.filter((m) => (warnCount.get(m.id) ?? 0) >= WARNING_LIMIT);
  const active = rows.filter((p) => p.status === "ATIVA" && (!p.expiresAt || p.expiresAt > now));
  const past = rows.filter((p) => !active.includes(p));

  return (
    <>
      <PageHeader
        title="Punições"
        description={canManage ? "Advertências, multas, suspensões, rebaixamentos e expulsões." : "Suas punições na Leviata."}
        actions={
          canManage && (
            <FormDialog
              title="Aplicar punição"
              action={createPunishment}
              submitLabel="Aplicar"
              trigger={
                <Button>
                  <PlusIcon /> Aplicar punição
                </Button>
              }
            >
              <PunishmentFields
                members={members
                  .filter((m) => m.id !== viewer.member?.id)
                  .map((m) => ({ id: m.id, name: m.rpName, rank: m.rank?.name ?? null, warnings: warnCount.get(m.id) ?? 0 }))}
                ranks={ranks.map((r) => ({ id: r.id, name: r.name }))}
              />
            </FormDialog>
          )
        }
      />

      <div className="flex flex-col gap-10">
        {atLimit.length > 0 && (
          <div className="flex items-start gap-3 rounded-card bg-danger-low px-5 py-4 text-sm text-danger-light" data-testid="warning-limit">
            <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" />
            <span>
              Com {WARNING_LIMIT}+ advertências ativas:{" "}
              {atLimit.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ", "}
                  <Link href={`/membros/${m.id}`} className="font-bold underline">
                    {m.rpName}
                  </Link>{" "}
                  ({warnCount.get(m.id)})
                </span>
              ))}
              . Pelas regras da fac, é hora de rebaixar ou expulsar.
            </span>
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState icon={GavelIcon} title={canManage ? "Nenhuma punição registrada" : "Você não tem punições"} description={canManage ? undefined : "Continue assim."} />
        ) : (
          <>
            <GroupedList header={`Valendo agora · ${active.length}`}>
              {active.length === 0 ? <p className="px-5 py-4 text-base text-muted-foreground">Nenhuma.</p> : <PunishmentRows rows={active} canManage={canManage} showMember={canManage} />}
            </GroupedList>
            {past.length > 0 && (
              <GroupedList header="Histórico">
                <PunishmentRows rows={past} canManage={canManage} showMember={canManage} />
              </GroupedList>
            )}
          </>
        )}
      </div>
    </>
  );
}
