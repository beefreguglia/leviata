"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions";
import { ActionForm, SubmitButton } from "./action-form";

/** Botão que abre um diálogo com formulário; fecha sozinho ao salvar. */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Salvar",
  success,
  size = "md",
  defaultOpen = false,
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: (fd: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  success?: string;
  /** "lg" para formulários com editor de texto ou imagens */
  size?: "md" | "lg";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className={size === "lg" ? "max-h-[90vh] overflow-y-auto sm:max-w-2xl" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ActionForm action={action} success={success} onSuccess={() => setOpen(false)} className="flex flex-col gap-4">
          {children}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
