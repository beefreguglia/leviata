import { notFound } from "next/navigation";
import { ArrowUpDownIcon, PencilIcon, Undo2Icon, UserXIcon, UsersIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { ABSENCE_STATUS, ABSENT_BADGE, MEMBER_STATUS, presenceOf } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { GroupedList, GroupedRow } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Textarea } from "@/components/ui/textarea";
import { isGone } from "@/lib/members";
import { Field, NativeSelect } from "@/components/forms/fields";
import { PresenceAvatar } from "@/components/presence-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankBadge, SectorBadge, StatusBadge } from "@/components/status-badge";
import { FadeIn } from "@/components/motion";
import { MemberFields } from "../member-fields";
import { PunishmentRows } from "../../punicoes/punishment-list";
import { changeRank, dismissMember, readmitMember, setMemberSector, updateMember } from "../actions";

export default async function MemberPage({ params }: PageProps<"/membros/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    include: {
      rank: true,
      sector: true,
      managements: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      user: true,
      promotions: { include: { fromRank: true, toRank: true, by: true }, orderBy: { createdAt: "desc" } },
      absences: { orderBy: { startsAt: "desc" }, take: 10 },
    },
  });
  if (!member) notFound();

  const canSeePunishments = viewer.can("punicoes.aplicar") || viewer.can("punicoes.revogar") || viewer.member?.id === member.id;
  const [ranks, punishments, sectors, managements] = await Promise.all([
    db.rank.findMany({ orderBy: { order: "asc" } }),
    canSeePunishments
      ? db.punishment.findMany({ where: { memberId: member.id }, include: { member: true, createdBy: true }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([]),
    db.sector.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    db.management.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
  ]);
  const canRank = viewer.can("membros.patente");
  const canSector = viewer.can("membros.setor");
  const canEdit = viewer.can("membros.editar");
  const canLeave = viewer.can("membros.desligar");
  const canManageHierarchy = viewer.can("hierarquia.gerencias");
  const gone = isGone(member.status);
  // mesma regra das punições: só desliga quem está abaixo (admin pode tudo), nunca a si mesmo
  const canDismiss =
    canLeave &&
    !gone &&
    member.id !== viewer.member?.id &&
    (viewer.can("admin") || (member.rank?.order ?? Infinity) > (viewer.member?.rank?.order ?? Infinity));
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
          <h1 className="type-h1 text-grey-100">{member.rpName}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <RankBadge name={member.rank?.name} color={member.rank?.color} />
            {member.sector && <SectorBadge name={member.sector.name} color={member.sector.color} />}
            {member.managements.map((g) => (
              <StatusBadge key={g.id} label={g.name} className="bg-cyan-low text-cyan-light" />
            ))}
            <StatusBadge {...MEMBER_STATUS[member.status]} />
            {absentNow && <StatusBadge {...ABSENT_BADGE} />}
          </div>
        </div>
        {canLeave && gone && (
          <ConfirmButton
            title={`Readmitir ${member.rpName}?`}
            description="A ficha volta como ativa e o acesso ao painel é liberado de novo. Uma expulsão ativa é anulada."
            confirmLabel="Readmitir"
            action={readmitMember.bind(null, member.id)}
            trigger={
              <Button variant="secondary">
                <Undo2Icon /> Readmitir
              </Button>
            }
          />
        )}
        {!gone && (canRank || canSector || canEdit || canDismiss) && (
          <div className="flex flex-wrap justify-center gap-3">
            {canRank && (
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
            )}
            {canSector && (
            <FormDialog
              title="Setor e gerências"
              description="Com o servidor do Discord conectado, o que estiver ligado a um cargo segue o Discord no próximo login."
              action={setMemberSector.bind(null, member.id)}
              trigger={
                <Button variant="secondary">
                  <UsersIcon /> Setor
                </Button>
              }
            >
              <Field label="Setor" htmlFor="sectorId">
                <NativeSelect id="sectorId" name="sectorId" defaultValue={member.sectorId ?? ""}>
                  <option value="">Sem setor</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.description ? ` (${s.description})` : ""}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {canManageHierarchy && managements.length > 0 && (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-2 text-sm font-medium text-grey-200">Gerências</legend>
                  <input type="hidden" name="managementsField" value="1" />
                  <div className="overflow-hidden rounded-md bg-input [&>*+*]:border-t [&>*+*]:border-grey-700">
                    {managements.map((g) => (
                      <label key={g.id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-base">
                        {g.name}
                        <input type="checkbox" name="managementIds" value={g.id} defaultChecked={member.managements.some((x) => x.id === g.id)} className="size-5 accent-[var(--primary)]" />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </FormDialog>
            )}
            {canEdit && (
            <FormDialog
              title="Editar ficha"
              action={updateMember.bind(null, member.id)}
              trigger={
                <Button variant="secondary">
                  <PencilIcon /> Editar
                </Button>
              }
            >
              <MemberFields member={member} canEditContact={viewer.isDev} />
            </FormDialog>
            )}
            {canDismiss && (
              <FormDialog
                title={`Desligar ${member.rpName}`}
                description="A pessoa sai das listas e perde o acesso ao painel. O histórico fica guardado e dá para readmitir depois."
                action={dismissMember.bind(null, member.id)}
                submitLabel="Desligar"
                trigger={
                  <Button variant="destructive">
                    <UserXIcon /> Desligar
                  </Button>
                }
              >
                <Field label="Motivo" htmlFor="kind">
                  <NativeSelect id="kind" name="kind" required defaultValue="">
                    <option value="" disabled>
                      Escolha…
                    </option>
                    <option value="SAIU">Quis sair</option>
                    <option value="EXPULSO">Expulsão</option>
                  </NativeSelect>
                </Field>
                <Field label="Explique" htmlFor="reason" hint="Expulsão também entra em Punições.">
                  <Textarea id="reason" name="reason" required minLength={3} maxLength={500} placeholder="Ex.: pediu para sair no Discord" />
                </Field>
              </FormDialog>
            )}
          </div>
        )}
      </FadeIn>

      <div className="flex flex-col gap-10">
        {gone && (
          <GroupedList header="Desligamento">
            <GroupedRow label={member.status === "EXPULSO" ? "Expulso em" : "Saiu em"}>{fmtDate(member.leftAt)}</GroupedRow>
            {member.leftReason && <p className="px-5 py-4 text-base whitespace-pre-wrap">{member.leftReason}</p>}
          </GroupedList>
        )}
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
              <PunishmentRows rows={punishments} canManage={viewer.can("punicoes.revogar")} showMember={false} />
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
