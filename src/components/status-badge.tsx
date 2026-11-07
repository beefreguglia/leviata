import { cn } from "@/lib/utils";

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-xs font-bold whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Tag da patente: pílula com a cor da patente. */
export function RankBadge({ name, color, className }: { name?: string | null; color?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full bg-grey-700 px-3 text-xs font-bold whitespace-nowrap text-grey-100 transition-colors", className)}>
      <span className="size-2 rounded-full" style={{ background: color ?? "var(--muted-foreground)" }} />
      {name ?? "Sem patente"}
    </span>
  );
}
