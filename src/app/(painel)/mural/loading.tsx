import { CardGridSkeleton, HeaderSkeleton, LoadingRegion } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <CardGridSkeleton />
    </LoadingRegion>
  );
}
