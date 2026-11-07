import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { activeAbsenceWhere } from "@/lib/absences";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { PresenceAvatar } from "@/components/presence-avatar";
import { presenceOf } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion";
import { RankFields } from "./rank-fields";
import { createRank, deleteRank, updateRank } from "./actions";

export const metadata = { title: "Hierarquia" };

export default async function HierarquiaPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("hierarquia.gerenciar");

  const [ranks, noRank] = await Promise.all([
    db.rank.findMany({
      orderBy: { order: "asc" },
      include: {
        members: {
          where: { status: { not: "EXPULSO" } },
          include: { user: true, absences: { where: activeAbsenceWhere(), take: 1 } },
          orderBy: { rpName: "asc" },
        },
      },
    }),
    db.member.count({ where: { rankId: null, status: { not: "EXPULSO" } } }),
  ]);
  const nextOrder = (ranks.at(-1)?.order ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Hierarquia"
        description="Da liderança aos recrutas. A patente vem do cargo no Discord."
        actions={
          canManage && (
            <FormDialog
              title="Nova patente"
              action={createRank}
              submitLabel="Criar"
              trigger={
                <Button>
                  <PlusIcon /> Nova patente
                </Button>
              }
            >
              <RankFields nextOrder={nextOrder} />
            </FormDialog>
          )
        }
      />

      <Stagger className="flex flex-col gap-10">
        {ranks.map((rank) => (
          <StaggerItem key={rank.id}>
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold text-grey-100">
                  <span className="size-2.5 rounded-full" style={{ background: rank.color }} />
                  {rank.name}
                  <span className="text-sm font-normal text-muted-foreground tabular-nums">
                    {rank.members.length}
                  </span>
                </h2>
                {canManage && (
                  <div className="flex items-center">
                    <FormDialog
                      title={`Editar ${rank.name}`}
                      action={updateRank.bind(null, rank.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Editar ${rank.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    >
                      <RankFields rank={rank} />
                    </FormDialog>
                    <ConfirmButton
                      title={`Apagar ${rank.name}?`}
                      description="Só dá para apagar patentes sem membros."
                      confirmLabel="Apagar"
                      destructive
                      action={deleteRank.bind(null, rank.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Apagar ${rank.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
              <div className="rounded-card bg-card p-5">
                {rank.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ninguém nesta patente.</p>
                ) : (
                  <ul className="flex flex-wrap gap-3">
                    {rank.members.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/membros/${m.id}`}
                          className="group flex h-12 items-center gap-3 rounded-md bg-grey-700 pr-4 pl-2 text-sm font-medium text-grey-100 transition-colors hover:bg-grey-600"
                        >
                          <PresenceAvatar
                            name={m.rpName}
                            src={m.user?.avatarUrl}
                            presence={presenceOf(m.status, m.absences.length > 0)}
                            size="sm"
                            ringClassName="ring-grey-700 group-hover:ring-grey-600"
                          />
                          {m.rpName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {canManage && (
                <p className="text-xs leading-base text-muted-foreground">
                  {rank.discordRoleId ? `Cargo Discord ${rank.discordRoleId}` : "Sem cargo do Discord vinculado"} ·{" "}
                  {rank.permissions.length === 0
                    ? "sem acesso ao painel"
                    : rank.permissions.map((p) => PERMISSIONS[p as Permission] ?? p).join(", ")}
                </p>
              )}
            </section>
          </StaggerItem>
        ))}
        {noRank > 0 && (
          <p className="px-4 text-sm text-muted-foreground">
            {noRank} {noRank === 1 ? "membro está" : "membros estão"} sem patente.
          </p>
        )}
      </Stagger>
    </>
  );
}
