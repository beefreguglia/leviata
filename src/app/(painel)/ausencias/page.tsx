import Link from "next/link";
import { CalendarOffIcon, PlusIcon } from "lucide-react";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { activeAbsenceWhere } from "@/lib/absences";
import { fmtAgo, toDateInputBRT } from "@/lib/dates";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stagger, StaggerItem } from "@/components/motion";
import { AbsenceRow } from "./absence-row";
import { createAbsence } from "./actions";

export const metadata = { title: "Ausências" };

const INACTIVE_DAYS = 7;

export default async function AusenciasPage() {
  const viewer = await requireViewer();
  const canManage = viewer.can("ausencias.gerenciar");
  const now = new Date();
  const include = { member: true } as const;

  const [current, upcoming, pending, mine, silent] = await Promise.all([
    // ausências dos outros: só quem gerencia (os demais veem só os próprios avisos)
    canManage ? db.absence.findMany({ where: activeAbsenceWhere(now), include, orderBy: { endsAt: "asc" } }) : Promise.resolve([]),
    canManage
      ? db.absence.findMany({
          where: { status: { in: ["PENDENTE", "APROVADA"] }, startsAt: { gt: now } },
          include,
          orderBy: { startsAt: "asc" },
          take: 20,
        })
      : Promise.resolve([]),
    canManage
      ? db.absence.findMany({ where: { status: "PENDENTE", endsAt: { gte: now } }, include, orderBy: { startsAt: "asc" } })
      : Promise.resolve([]),
    viewer.member
      ? db.absence.findMany({ where: { memberId: viewer.member.id }, include, orderBy: { startsAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    // sumidos: ativos, sem login há X dias e sem ausência ativa
    canManage
      ? db.member.findMany({
          where: {
            status: "ATIVO",
            user: { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: subDays(now, INACTIVE_DAYS) } }] },
            absences: { none: activeAbsenceWhere(now) },
          },
          include: { user: true },
          orderBy: { user: { lastLoginAt: "asc" } },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const today = toDateInputBRT(now);

  return (
    <>
      <PageHeader
        title="Ausências"
        description="Vai ficar fora? Avise aqui — você sai das escalações nesse período."
        actions={
          <FormDialog
            title="Avisar ausência"
            description={canManage ? "Como você é da gerência, o aviso já sai aprovado." : "A liderança recebe o aviso no Discord."}
            action={createAbsence}
            submitLabel="Enviar aviso"
            trigger={
              <Button>
                <PlusIcon /> Avisar ausência
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Saio em" htmlFor="startsAt">
                <Input id="startsAt" name="startsAt" type="date" required min={today} defaultValue={today} />
              </Field>
              <Field label="Volto em" htmlFor="endsAt">
                <Input id="endsAt" name="endsAt" type="date" required min={today} />
              </Field>
            </div>
            <Field label="Motivo" htmlFor="reason">
              <Textarea id="reason" name="reason" required rows={3} placeholder="Ex.: viagem, prova, trabalho…" />
            </Field>
          </FormDialog>
        }
      />

      <Stagger className="flex flex-col gap-10">
        {canManage && pending.length > 0 && (
          <StaggerItem>
            <GroupedList header={`Aguardando aprovação · ${pending.length}`}>
              {pending.map((a) => (
                <AbsenceRow key={a.id} absence={a} canReview canCancel />
              ))}
            </GroupedList>
          </StaggerItem>
        )}

        {canManage && (
          <StaggerItem>
            {current.length === 0 ? (
              <GroupedList header="Fora agora">
                <p className="px-5 py-4 text-base text-muted-foreground">Todo mundo na ativa.</p>
              </GroupedList>
            ) : (
              <GroupedList header={`Fora agora · ${current.length}`}>
                {current.map((a) => (
                  <AbsenceRow key={a.id} absence={a} canCancel />
                ))}
              </GroupedList>
            )}
          </StaggerItem>
        )}

        {upcoming.length > 0 && (
          <StaggerItem>
            <GroupedList header="Próximas">
              {upcoming.map((a) => (
                <AbsenceRow key={a.id} absence={a} canCancel={canManage || a.memberId === viewer.member?.id} />
              ))}
            </GroupedList>
          </StaggerItem>
        )}

        {canManage && silent.length > 0 && (
          <StaggerItem>
            <GroupedList
              header="Sumidos sem aviso"
              footer={`Membros ativos que não entram no painel há mais de ${INACTIVE_DAYS} dias e não avisaram ausência.`}
            >
              {silent.map((m) => (
                <Link
                  key={m.id}
                  href={`/membros/${m.id}`}
                  className="flex min-h-12 items-center justify-between px-5 py-4 text-base hover:bg-grey-700"
                >
                  {m.rpName}
                  <span className="text-sm text-muted-foreground">
                    {m.user?.lastLoginAt ? `visto ${fmtAgo(m.user.lastLoginAt)}` : "nunca entrou"}
                  </span>
                </Link>
              ))}
            </GroupedList>
          </StaggerItem>
        )}

        <StaggerItem>
          {mine.length === 0 ? (
            <EmptyState icon={CalendarOffIcon} title="Você não tem avisos" description="Quando precisar se ausentar, use o botão acima." />
          ) : (
            <GroupedList header="Meus avisos">
              {mine.map((a) => (
                <AbsenceRow key={a.id} absence={a} showMember={false} canCancel />
              ))}
            </GroupedList>
          )}
        </StaggerItem>
      </Stagger>
    </>
  );
}
