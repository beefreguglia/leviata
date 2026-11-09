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
import { ManagementFields, SectorFields } from "./sector-fields";
import {
  createManagement, createRank, createSector, deleteManagement, deleteRank, deleteSector, updateManagement, updateRank, updateSector,
} from "./actions";

export const metadata = { title: "Hierarquia" };

export default async function HierarquiaPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("hierarquia.gerenciar");

  const memberInclude = { user: true, absences: { where: activeAbsenceWhere(), take: 1 } } as const;
  const activeMembers = { where: { status: { not: "EXPULSO" as const } }, include: memberInclude, orderBy: { rpName: "asc" as const } };
  const [ranks, noRank, sectors, managements] = await Promise.all([
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
    db.sector.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { members: activeMembers, managements: { include: { members: activeMembers } } } }),
    db.management.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { sector: true, members: activeMembers } }),
  ]);
  const nextOrder = (ranks.at(-1)?.order ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Hierarquia"
        description="Patentes, setores e gerências. Tudo pode vir dos cargos do Discord."
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
              <div className="rounded-card glass-card p-5">
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

      {/* ---------------- Setores ---------------- */}
      <section className="mt-14 flex flex-col gap-4" aria-labelledby="setores">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="setores" className="type-h1 text-grey-100">
              Setores
            </h2>
            <p className="type-small text-muted-foreground">Cada membro faz parte de um setor.</p>
          </div>
          {canManage && (
            <FormDialog
              title="Novo setor"
              action={createSector}
              submitLabel="Criar"
              trigger={
                <Button variant="secondary">
                  <PlusIcon /> Novo setor
                </Button>
              }
            >
              <SectorFields />
            </FormDialog>
          )}
        </div>
        {sectors.length === 0 ? (
          <p className="rounded-card glass-card px-5 py-4 text-base text-muted-foreground">Nenhum setor cadastrado.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {sectors.map((sector) => {
              const managers = sector.managements.flatMap((g) => g.members.map((m) => ({ g: g.name, m })));
              return (
                <article key={sector.id} className="flex flex-col gap-3 rounded-card glass-card p-5" data-testid="sector-card">
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="flex items-center gap-2 type-h3 text-grey-100">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: sector.color }} />
                        {sector.name}
                        <span className="type-small text-muted-foreground tabular-nums">{sector.members.length}</span>
                      </h3>
                      {sector.description && <span className="type-label text-muted-foreground">{sector.description}</span>}
                    </div>
                    {canManage && (
                      <div className="flex items-center">
                        <FormDialog
                          title={`Editar ${sector.name}`}
                          action={updateSector.bind(null, sector.id)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Editar setor ${sector.name}`}>
                              <PencilIcon />
                            </Button>
                          }
                        >
                          <SectorFields sector={sector} />
                        </FormDialog>
                        <ConfirmButton
                          title={`Apagar o setor ${sector.name}?`}
                          description="Só dá para apagar setores sem membros."
                          confirmLabel="Apagar"
                          destructive
                          action={deleteSector.bind(null, sector.id)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Apagar setor ${sector.name}`}>
                              <Trash2Icon />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </header>
                  {managers.length > 0 && (
                    <p className="type-small text-grey-300">
                      {managers.map(({ g, m }, i) => (
                        <span key={`${g}-${m.id}`}>
                          {i > 0 && " · "}
                          <span className="font-semibold text-cyan-light">{g}</span> {m.rpName}
                        </span>
                      ))}
                    </p>
                  )}
                  {sector.members.length === 0 ? (
                    <p className="type-small text-muted-foreground">Ninguém neste setor.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {sector.members.map((m) => (
                        <li key={m.id}>
                          <Link href={`/membros/${m.id}`} className="inline-flex h-9 items-center rounded-md bg-grey-700 px-3 text-sm font-medium text-grey-100 transition-colors hover:bg-grey-600">
                            {m.rpName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canManage && (
                    <p className="type-caption text-muted-foreground">{sector.discordRoleId ? `Cargo Discord ${sector.discordRoleId}` : "Sem cargo do Discord vinculado"}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- Gerências ---------------- */}
      <section className="mt-14 flex flex-col gap-4" aria-labelledby="gerencias">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="gerencias" className="type-h1 text-grey-100">
              Gerências
            </h2>
            <p className="type-small text-muted-foreground">Somam permissões às da patente. Um membro pode ter mais de uma.</p>
          </div>
          {canManage && (
            <FormDialog
              title="Nova gerência"
              action={createManagement}
              submitLabel="Criar"
              trigger={
                <Button variant="secondary">
                  <PlusIcon /> Nova gerência
                </Button>
              }
            >
              <ManagementFields sectors={sectors} />
            </FormDialog>
          )}
        </div>
        {managements.length === 0 ? (
          <p className="rounded-card glass-card px-5 py-4 text-base text-muted-foreground">Nenhuma gerência cadastrada.</p>
        ) : (
          <div className="overflow-hidden rounded-card glass-card [&>*+*]:border-t [&>*+*]:border-white/10">
            {managements.map((g) => (
              <div key={g.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between" data-testid="management-row">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="type-h3 text-grey-100">{g.name}</span>
                    {g.sector ? (
                      <span className="inline-flex items-center gap-1.5 type-label text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ background: g.sector.color }} />
                        {g.sector.name}
                      </span>
                    ) : (
                      <span className="type-label text-muted-foreground">Geral</span>
                    )}
                  </span>
                  <span className="type-small text-grey-300">{g.members.length ? g.members.map((m) => m.rpName).join(", ") : "Ninguém com esta gerência"}</span>
                  {canManage && (
                    <span className="type-caption text-muted-foreground">
                      {g.discordRoleId ? `Cargo Discord ${g.discordRoleId}` : "Sem cargo do Discord vinculado"} ·{" "}
                      {g.permissions.length ? g.permissions.map((p) => PERMISSIONS[p as Permission] ?? p).join(", ") : "não soma permissões"}
                    </span>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center">
                    <FormDialog
                      title={`Editar ${g.name}`}
                      action={updateManagement.bind(null, g.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Editar gerência ${g.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    >
                      <ManagementFields management={g} sectors={sectors} />
                    </FormDialog>
                    <ConfirmButton
                      title={`Apagar a gerência ${g.name}?`}
                      description="Quem tem esta gerência perde as permissões dela."
                      confirmLabel="Apagar"
                      destructive
                      action={deleteManagement.bind(null, g.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Apagar gerência ${g.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
