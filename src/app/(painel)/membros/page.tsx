import Link from "next/link";
import { ChevronRightIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { activeAbsenceWhere } from "@/lib/absences";
import { MEMBER_STATUS, presenceOf } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { NativeSelect } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankBadge } from "@/components/status-badge";
import { PresenceAvatar, PresenceLegend } from "@/components/presence-avatar";
import { Stagger, StaggerItem } from "@/components/motion";
import { MemberFields } from "./member-fields";
import { createMember } from "./actions";

export const metadata = { title: "Membros" };

export default async function MembrosPage({ searchParams }: PageProps<"/membros">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "ATUAIS";

  const where: Prisma.MemberWhereInput = {};
  if (q) {
    where.OR = [
      { rpName: { contains: q, mode: "insensitive" } },
      { passport: { contains: q } },
      { user: { username: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (status === "ATUAIS") where.status = { not: "EXPULSO" };
  else if (status in MEMBER_STATUS) where.status = status as keyof typeof MEMBER_STATUS;

  const [members, ranks, total] = await Promise.all([
    db.member.findMany({
      where,
      include: { rank: true, user: true, absences: { where: activeAbsenceWhere(), take: 1 } },
      orderBy: [{ rank: { order: "asc" } }, { rpName: "asc" }],
    }),
    db.rank.findMany({ orderBy: { order: "asc" } }),
    db.member.count({ where: { status: { not: "EXPULSO" } } }),
  ]);

  const canManage = viewer.can("membros.gerenciar");

  return (
    <>
      <PageHeader
        title="Membros"
        description={`${total} ${total === 1 ? "membro" : "membros"} na Leviata`}
        actions={
          canManage && (
            <FormDialog
              title="Novo membro"
              description="Membros que entram pelo Discord são cadastrados sozinhos. Use isto para quem ainda não logou."
              action={createMember}
              submitLabel="Cadastrar"
              trigger={
                <Button>
                  <PlusIcon /> Novo membro
                </Button>
              }
            >
              <MemberFields ranks={ranks} />
            </FormDialog>
          )
        }
      />

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-500" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome, passaporte ou Discord" className="bg-card pl-12" />
        </div>
        <div className="flex gap-3">
          <NativeSelect name="status" defaultValue={status} className="bg-card sm:w-44" aria-label="Filtrar por status">
            <option value="ATUAIS">Atuais</option>
            {Object.entries(MEMBER_STATUS).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
            <option value="TODOS">Todos</option>
          </NativeSelect>
          <Button type="submit" variant="secondary" size="lg">
            Filtrar
          </Button>
        </div>
      </form>

      {members.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nenhum membro encontrado"
          description={q ? "Tente outro nome ou passaporte." : "Cadastre o primeiro membro ou peça para a galera logar com o Discord."}
        />
      ) : (
        <div className="flex flex-col gap-3">
        <PresenceLegend />
        <Stagger className="overflow-hidden rounded-card bg-card">
          {members.map((m, i) => {
            const presence = presenceOf(m.status, m.absences.length > 0);
            return (
              <StaggerItem key={m.id} className={i > 0 ? "border-t border-border" : undefined}>
                <Link
                  href={`/membros/${m.id}`}
                  className="group flex min-h-14 items-center gap-4 px-5 py-4 transition-colors hover:bg-grey-700 focus-visible:bg-grey-700 focus-visible:outline-none"
                >
                  <PresenceAvatar
                    name={m.rpName}
                    src={m.user?.avatarUrl}
                    presence={presence}
                    ringClassName="ring-card group-hover:ring-grey-700 group-focus-visible:ring-grey-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{m.rpName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.passport ? `#${m.passport}` : "sem passaporte"}
                      {m.user ? ` · @${m.user.username}` : ""}
                      <span className="hidden sm:inline"> · visto {fmtAgo(m.user?.lastLoginAt)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <RankBadge name={m.rank?.name} color={m.rank?.color} className="group-hover:bg-grey-600 group-focus-visible:bg-grey-600" />
                    <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
        </div>
      )}
    </>
  );
}
