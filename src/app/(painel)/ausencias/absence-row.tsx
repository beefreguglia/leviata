import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";
import { ABSENCE_STATUS } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { ActionForm } from "@/components/forms/action-form";
import { Button } from "@/components/ui/button";
import type { Absence, Member } from "@/generated/prisma/client";
import { cancelAbsence, reviewAbsence } from "./actions";

export function AbsenceRow({
  absence,
  showMember = true,
  canReview,
  canCancel,
}: {
  absence: Absence & { member: Member };
  showMember?: boolean;
  canReview?: boolean;
  canCancel?: boolean;
}) {
  const now = new Date();
  const started = absence.startsAt <= now;
  const active = absence.status === "PENDENTE" || absence.status === "APROVADA";

  return (
    <div data-testid="absence-row" className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-base">
          {showMember && (
            <Link href={`/membros/${absence.member.id}`} className="font-medium hover:underline">
              {absence.member.rpName}
            </Link>
          )}
          {showMember && <span className="text-muted-foreground"> · </span>}
          <span className={showMember ? "text-muted-foreground" : ""}>
            {fmtDate(absence.startsAt)} – {fmtDate(absence.endsAt)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{absence.reason}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge {...ABSENCE_STATUS[absence.status]} />
        {canReview && absence.status === "PENDENTE" && (
          <>
            <ActionForm action={async () => { "use server"; return reviewAbsence(absence.id, true); }}>
              <Button type="submit" size="sm" variant="secondary" className="h-9">
                <CheckIcon className="text-success" /> Aprovar
              </Button>
            </ActionForm>
            <ConfirmButton
              title={`Recusar ausência de ${absence.member.rpName}?`}
              confirmLabel="Recusar"
              destructive
              action={reviewAbsence.bind(null, absence.id, false)}
              trigger={
                <Button size="sm" variant="ghost" className="h-9">
                  <XIcon /> Recusar
                </Button>
              }
            />
          </>
        )}
        {canCancel && active && (
          <ConfirmButton
            title={started ? "Voltou antes?" : "Cancelar este aviso?"}
            description={started ? "A ausência termina agora." : undefined}
            confirmLabel={started ? "Voltei" : "Cancelar aviso"}
            action={cancelAbsence.bind(null, absence.id)}
            trigger={
              <Button size="sm" variant="ghost" className="h-9">
                {started ? "Voltei" : "Cancelar"}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
