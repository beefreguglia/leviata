import { Skeleton } from "@/components/ui/skeleton";
import { BlockSkeleton, LoadingRegion, StatsSkeleton } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando o início">
      <div className="mb-10 flex flex-col gap-3">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-10 w-72 rounded-md" />
      </div>
      <StatsSkeleton icon={false} />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <BlockSkeleton className="h-64" />
        <BlockSkeleton className="h-64" />
      </div>
    </LoadingRegion>
  );
}
