import { BlockSkeleton, HeaderSkeleton, ListSkeleton, LoadingRegion, StatsSkeleton } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando as vendas">
      <HeaderSkeleton />
      <StatsSkeleton />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <BlockSkeleton className="h-80" />
        <BlockSkeleton className="h-80" />
      </div>
      <ListSkeleton rows={6} avatar={false} className="mt-10" />
    </LoadingRegion>
  );
}
