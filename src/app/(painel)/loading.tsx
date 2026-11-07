import { HeaderSkeleton, ListSkeleton, LoadingRegion } from "@/components/layout/skeletons";

/** Carregamento padrão das páginas do painel (o menu e o cabeçalho continuam na tela). */
export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <ListSkeleton />
    </LoadingRegion>
  );
}
