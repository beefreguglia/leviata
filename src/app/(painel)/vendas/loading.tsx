import { HeaderSkeleton, ListSkeleton, LoadingRegion, StatsSkeleton } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando as vendas">
      <HeaderSkeleton />
      <StatsSkeleton />
      <ListSkeleton rows={6} avatar={false} className="mt-10" />
    </LoadingRegion>
  );
}
