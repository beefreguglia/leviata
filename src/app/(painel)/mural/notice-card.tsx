import { PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { ActionForm } from "@/components/forms/action-form";
import { NOTICE_PRIORITY } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Member, Notice } from "@/generated/prisma/client";
import { NoticeFields } from "./notice-fields";
import { deleteNotice, toggleNoticePin, updateNotice } from "./actions";

export function NoticeCard({
  notice,
  canEdit,
  compact,
}: {
  notice: Notice & { author: Member | null };
  canEdit?: boolean;
  compact?: boolean;
}) {
  const p = NOTICE_PRIORITY[notice.priority];
  const expired = notice.expiresAt && notice.expiresAt < new Date();
  return (
    <article
      data-testid="notice"
      className={cn("relative flex flex-col gap-3 overflow-hidden rounded-card bg-card p-6 pl-7", expired && "opacity-60")}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", p.bar)} aria-hidden="true" />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-grey-100">
            {notice.isPinned && <PinIcon className="size-4 shrink-0 text-primary" aria-label="Fixado" />}
            {notice.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {notice.author?.rpName ?? "Liderança"} · {fmtAgo(notice.createdAt)}
            {notice.expiresAt && ` · ${expired ? "expirou" : "até"} ${fmtDate(notice.expiresAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {notice.priority !== "NORMAL" && <StatusBadge {...p} />}
          {canEdit && !compact && (
            <>
              <ActionForm action={async () => { "use server"; return toggleNoticePin(notice.id); }}>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label={notice.isPinned ? "Desafixar" : "Fixar"} title={notice.isPinned ? "Desafixar" : "Fixar"}>
                  {notice.isPinned ? <PinOffIcon /> : <PinIcon />}
                </Button>
              </ActionForm>
              <FormDialog
                title="Editar aviso"
                size="lg"
                action={updateNotice.bind(null, notice.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Editar aviso ${notice.title}`}>
                    <PencilIcon />
                  </Button>
                }
              >
                <NoticeFields notice={notice} />
              </FormDialog>
              <ConfirmButton
                title={`Apagar "${notice.title}"?`}
                confirmLabel="Apagar"
                destructive
                action={deleteNotice.bind(null, notice.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Apagar aviso ${notice.title}`}>
                    <Trash2Icon />
                  </Button>
                }
              />
            </>
          )}
        </div>
      </header>
      <Markdown className={compact ? "line-clamp-4" : undefined}>{notice.content}</Markdown>
    </article>
  );
}
