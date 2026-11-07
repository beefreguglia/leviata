import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Campo com label acima e dica em footnote (HIG). */
export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-grey-200">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs leading-base text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** <select> nativo estilizado — funciona direto com FormData e é o melhor no mobile. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full appearance-none rounded-md border-2 border-transparent bg-input px-4 pr-10 text-base outline-none focus-visible:border-primary disabled:opacity-50 [background-image:url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20stroke%3D%22%238d8d99%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22/%3E%3C/svg%3E')] [background-position:right_14px_center] [background-repeat:no-repeat] [background-size:16px]",
        className,
      )}
      {...props}
    />
  );
}
