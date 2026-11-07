import Link from "next/link";
import { ImageIcon, PlusIcon, TargetIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Perímetros" };

export default async function PerimetrosPage() {
  const viewer = await requireViewer();
  const perimeters = await db.perimeter.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader
        title="Perímetros"
        description="A vista de cima de cada alvo, para combinar as posições antes da ação."
        actions={
          viewer.can("operacoes.gerenciar") && (
            <LinkButton href="/perimetros/novo">
              <PlusIcon /> Novo perímetro
            </LinkButton>
          )
        }
      />
      {perimeters.length === 0 ? (
        <EmptyState icon={TargetIcon} title="Nenhum perímetro ainda" description="Envie a imagem de um alvo vista de cima." />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {perimeters.map((p) => (
            <StaggerItem key={p.id}>
              <Link
                href={`/perimetros/${p.id}`}
                data-testid="perimeter-card"
                className="flex h-full flex-col overflow-hidden rounded-card bg-card transition-colors hover:bg-grey-700"
              >
                {p.imageId ? (
                  <UploadImage id={p.imageId} alt="" className="aspect-[4/3] w-full" />
                ) : (
                  <span className="flex aspect-[4/3] w-full items-center justify-center bg-input text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </span>
                )}
                <h3 className="p-5 text-lg font-bold text-grey-100">{p.name}</h3>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
