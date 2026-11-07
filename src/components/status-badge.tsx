import { cn } from "@/lib/utils";

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 font-label text-[0.8125rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap",
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
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full bg-grey-700 px-3 font-label text-[0.8125rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-grey-100 transition-colors", className)}>
      <span className="size-2 rounded-full" style={{ background: color ?? "var(--muted-foreground)" }} />
      {name ?? "Sem patente"}
    </span>
  );
}

/** Tag do setor: pílula com a cor do setor. */
export function SectorBadge({ name, color, className }: { name: string; color?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border border-grey-600 px-3 font-label text-[0.8125rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-grey-200", className)}>
      <span className="size-2 rounded-full" style={{ background: color ?? "var(--muted-foreground)" }} />
      {name}
    </span>
  );
}
