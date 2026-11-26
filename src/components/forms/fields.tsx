import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { SelectSearch } from "./select-search";

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
/**
 * Select do painel: aceita <option> como um <select>, mas é um autocomplete
 * (digite parte do nome para filtrar). Ver `SelectSearch`.
 */
export function NativeSelect(props: React.ComponentProps<"select">) {
  return <SelectSearch {...props} />;
}
