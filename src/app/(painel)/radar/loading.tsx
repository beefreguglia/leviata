import { HeaderSkeleton, ListSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion label="Carregando o radar">
      <HeaderSkeleton action={false} />
      <ListSkeleton />
    </LoadingRegion>
  );
}
