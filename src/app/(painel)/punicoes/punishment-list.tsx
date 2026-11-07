import { CheckIcon, Undo2Icon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PUNISHMENT_KIND, PUNISHMENT_STATUS } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { money } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { Member, Punishment } from "@/generated/prisma/client";
import { completePunishment, revokePunishment } from "./actions";

type Row = Punishment & { member: Member; createdBy: Member | null };

/** Linhas de punição (usadas na página de punições e na ficha do membro). */
export function PunishmentRows({ rows, canManage, showMember = true }: { rows: Row[]; canManage: boolean; showMember?: boolean }) {
  const now = new Date();
  return rows.map((p) => {
    const expired = p.status === "ATIVA" && p.expiresAt && p.expiresAt <= now;
    const status = expired ? { label: "Vencida", className: "bg-grey-600 text-grey-300" } : PUNISHMENT_STATUS[p.status];
    return (
      <div key={p.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center" data-testid="punishment">
        <div className="min-w-0 flex-1">
          <p className={cn("flex flex-wrap items-center gap-1.5 text-base text-grey-100", p.status === "REVOGADA" && "opacity-60")}>
            <StatusBadge {...PUNISHMENT_KIND[p.kind]} />
            {showMember && <strong>{p.member.rpName}</strong>}
            {p.fineAmount ? <span className="text-sm text-warning">{money(p.fineAmount)}</span> : null}
          </p>
          <p className="mt-1 text-sm text-grey-300">{p.reason}</p>
          <p className="text-xs text-muted-foreground">
            {fmtAgo(p.createdAt)}
            {p.createdBy && ` · por ${p.createdBy.rpName}`}
            {p.expiresAt && p.status === "ATIVA" && ` · ${expired ? "venceu" : "vale até"} ${fmtDate(p.expiresAt)}`}
            {p.revokeReason && ` · revogada: ${p.revokeReason}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge {...status} />
          {canManage && p.status === "ATIVA" && !expired && (p.kind === "MULTA" || p.kind === "SUSPENSAO") && (
            <ActionForm action={async () => { "use server"; return completePunishment(p.id); }}>
              <SubmitButton size="sm" variant="ghost">
                <CheckIcon /> {p.kind === "MULTA" ? "Paga" : "Cumprida"}
              </SubmitButton>
            </ActionForm>
          )}
          {canManage && p.status !== "REVOGADA" && (
            <FormDialog
              title={`Revogar ${PUNISHMENT_KIND[p.kind].label.toLowerCase()}?`}
              description={p.kind === "EXPULSAO" ? `${p.member.rpName} volta como membro ativo.` : undefined}
              action={revokePunishment.bind(null, p.id)}
              submitLabel="Revogar"
              trigger={
                <Button size="icon-sm" variant="ghost" aria-label={`Revogar punição de ${p.member.rpName}`}>
                  <Undo2Icon />
                </Button>
              }
            >
              <Field label="Motivo da revogação" htmlFor={`rv-${p.id}`}>
                <Input id={`rv-${p.id}`} name="revokeReason" required />
              </Field>
            </FormDialog>
          )}
        </div>
      </div>
    );
  });
}
