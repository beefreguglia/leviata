"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/actions";

/** Ação que pede confirmação antes (apagar, recusar, cancelar...). */
export function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive,
  action,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  action: () => Promise<ActionResult>;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await action();
                if (r.ok) {
                  toast.success(r.message ?? "Feito");
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
