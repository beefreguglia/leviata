import { HeaderSkeleton, ListSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando o dossiê">
      <HeaderSkeleton />
      <ListSkeleton avatar={false} />
    </LoadingRegion>
  );
}
