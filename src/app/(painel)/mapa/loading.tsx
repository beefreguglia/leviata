import { BlockSkeleton, HeaderSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando o mapa">
      <HeaderSkeleton />
      <BlockSkeleton className="h-[60svh]" />
    </LoadingRegion>
  );
}
