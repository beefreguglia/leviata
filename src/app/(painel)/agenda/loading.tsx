import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando a agenda">
      <HeaderSkeleton />
      <div className="rounded-card bg-card p-5">
        <Skeleton className="mb-5 h-6 w-48 rounded" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md md:aspect-[4/3]" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
