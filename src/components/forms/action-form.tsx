"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions";

type State = (ActionResult & { at: number }) | null;

/** Formulário que chama uma Server Action e mostra toast de sucesso/erro. */
export function ActionForm({
  action,
  success,
  onSuccess,
  resetOnSuccess,
  className,
  children,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  success?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // O toast sai assim que a ação termina (não num efeito): se o formulário sumir da tela
  // depois de salvar (ex.: item que sai de uma lista), a confirmação continua aparecendo.
  const [, formAction] = useActionState<State, FormData>(async (_prev, fd) => {
    const result = await action(fd);
    if (result.ok) {
      toast.success(result.message ?? success ?? "Salvo");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
    return { ...result, at: Date.now() };
  }, null);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  variant,
  className,
  size,
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className}>
      {pending && <Loader2Icon className="animate-spin" />}
      {children}
    </Button>
  );
}
