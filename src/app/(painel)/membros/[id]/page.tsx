import { notFound } from "next/navigation";
import { ArrowUpDownIcon, PencilIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { ABSENCE_STATUS, ABSENT_BADGE, MEMBER_STATUS, presenceOf } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { GroupedList, GroupedRow } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, NativeSelect } from "@/components/forms/fields";
import { PresenceAvatar } from "@/components/presence-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankBadge, StatusBadge } from "@/components/status-badge";
import { FadeIn } from "@/components/motion";
import { MemberFields } from "../member-fields";
import { PunishmentRows } from "../../punicoes/punishment-list";
import { changeRank, updateMember } from "../actions";

export default async function MemberPage({ params }: PageProps<"/membros/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    include: {
      rank: true,
      user: true,
      promotions: { include: { fromRank: true, toRank: true, by: true }, orderBy: { createdAt: "desc" } },
      absences: { orderBy: { startsAt: "desc" }, take: 10 },
    },
  });
  if (!member) notFound();

  const canSeePunishments = viewer.can("punicoes.gerenciar") || viewer.member?.id === member.id;
  const [ranks, punishments] = await Promise.all([
    db.rank.findMany({ orderBy: { order: "asc" } }),
    canSeePunishments
      ? db.punishment.findMany({ where: { memberId: member.id }, include: { member: true, createdBy: true }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([]),
  ]);
  const canManage = viewer.can("membros.gerenciar");
  const now = new Date();
  const absentNow = member.absences.some(
    (a) => (a.status === "PENDENTE" || a.status === "APROVADA") && a.startsAt <= now && a.endsAt >= now,
  );

  return (
    <div className="mx-auto max-w-3xl">

      <FadeIn className="mb-10 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <PresenceAvatar
          name={member.rpName}
          src={member.user?.avatarUrl}
          presence={presenceOf(member.status, absentNow)}
          size="lg"
          ringClassName="ring-background"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-shorter md:text-[2rem]">{member.rpName}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <RankBadge name={member.rank?.name} color={member.rank?.color} />
            <StatusBadge {...MEMBER_STATUS[member.status]} />
            {absentNow && <StatusBadge {...ABSENT_BADGE} />}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-3">
            <FormDialog
              title="Alterar patente"
              description="Fica registrado no histórico de promoções."
              action={changeRank.bind(null, member.id)}
              trigger={
                <Button variant="secondary">
                  <ArrowUpDownIcon /> Patente
                </Button>
              }
            >
              <Field label="Nova patente" htmlFor="rankId">
                <NativeSelect id="rankId" name="rankId" defaultValue={member.rankId ?? ""}>
                  <option value="">Sem patente</option>
                  {ranks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Motivo" htmlFor="reason">
                <Input id="reason" name="reason" placeholder="Ex.: bateu as metas do mês" />
              </Field>
            </FormDialog>
            <FormDialog
              title="Editar ficha"
              action={updateMember.bind(null, member.id)}
              trigger={
                <Button variant="secondary">
                  <PencilIcon /> Editar
                </Button>
              }
            >
              <MemberFields member={member} />
            </FormDialog>
          </div>
        )}
      </FadeIn>

      <div className="flex flex-col gap-10">
        <GroupedList header="Ficha">
          <GroupedRow label="Passaporte">{member.passport ? `#${member.passport}` : "—"}</GroupedRow>
          <GroupedRow label="Telefone">{member.phone ?? "—"}</GroupedRow>
          <GroupedRow label="Discord">{member.user ? `@${member.user.username}` : "não vinculado"}</GroupedRow>
          <GroupedRow label="Na fac desde">{fmtDate(member.joinedAt)}</GroupedRow>
          <GroupedRow label="Aniversário">{fmtDate(member.birthday)}</GroupedRow>
          <GroupedRow label="Último acesso">{fmtAgo(member.user?.lastLoginAt)}</GroupedRow>
        </GroupedList>

        {member.notes && (
          <GroupedList header="Observações">
            <p className="px-5 py-4 text-base whitespace-pre-wrap">{member.notes}</p>
          </GroupedList>
        )}

        <GroupedList header="Histórico de patentes">
          {member.promotions.length === 0 ? (
            <GroupedRow label="Nenhuma mudança registrada" />
          ) : (
            member.promotions.map((p) => (
              <div key={p.id} className="flex flex-col gap-0.5 px-5 py-4">
                <p className="text-base">
                  {p.fromRank?.name ?? "—"} <span className="text-muted-foreground">→</span>{" "}
                  <span className="font-medium">{p.toRank?.name ?? "sem patente"}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {fmtDate(p.createdAt)}
                  {p.by ? ` · por ${p.by.rpName}` : ""}
                  {p.reason ? ` · ${p.reason}` : ""}
                </p>
              </div>
            ))
          )}
        </GroupedList>

        {canSeePunishments && (
          <GroupedList header="Punições">
            {punishments.length === 0 ? (
              <GroupedRow label="Nenhuma punição" />
            ) : (
              <PunishmentRows rows={punishments} canManage={viewer.can("punicoes.gerenciar")} showMember={false} />
            )}
          </GroupedList>
        )}

        <GroupedList header="Ausências recentes">
          {member.absences.length === 0 ? (
            <GroupedRow label="Nenhum aviso de ausência" />
          ) : (
            member.absences.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-base">
                    {fmtDate(a.startsAt)} – {fmtDate(a.endsAt)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{a.reason}</p>
                </div>
                <StatusBadge {...ABSENCE_STATUS[a.status]} />
              </div>
            ))
          )}
        </GroupedList>
      </div>
    </div>
  );
}
