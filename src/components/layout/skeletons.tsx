import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Peças de carregamento no formato das páginas (Andromeda: cards de 20px, linhas de 56px). */

export function LoadingRegion({ label = "Carregando", children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56 rounded-md md:h-10" />
        <Skeleton className="h-5 w-80 max-w-full rounded-md" />
      </div>
      {action && <Skeleton className="h-12 w-40 rounded-md" />}
    </div>
  );
}

export function ListSkeleton({ rows = 6, avatar = true, className }: { rows?: number; avatar?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-card bg-card", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-14 items-center gap-4 border-b border-grey-700 px-5 py-3 last:border-0">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/5 rounded" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 6, image = true }: { cards?: number; image?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-card bg-card">
          {image && <Skeleton className="aspect-[4/3] w-full rounded-none" />}
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-card bg-card p-5">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-card bg-card", className)} />;
}
