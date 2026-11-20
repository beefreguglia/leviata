import { HeaderSkeleton, ListSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <ListSkeleton rows={5} avatar={false} />
    </LoadingRegion>
  );
}
