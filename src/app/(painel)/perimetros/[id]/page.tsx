import { notFound } from "next/navigation";
import { CalendarPlusIcon, PencilIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { fmtAgo } from "@/lib/dates";
import { uploadUrl } from "@/lib/images";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";

export async function generateMetadata({ params }: PageProps<"/perimetros/[id]">) {
  const { id } = await params;
  const p = await db.perimeter.findUnique({ where: { id }, select: { name: true } });
  return { title: p?.name ?? "Perímetro" };
}

export default async function PerimeterPage({ params }: PageProps<"/perimetros/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const p = await db.perimeter.findUnique({ where: { id }, include: { author: true } });
  if (!p) notFound();
  const canManage = viewer.can("operacoes.gerenciar");

  return (
    <FadeIn className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-grey-100">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            Atualizado {fmtAgo(p.updatedAt)}
            {p.author ? ` por ${p.author.rpName}` : ""}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <LinkButton href={`/agenda?novo=1&perimetro=${p.id}`} variant="secondary">
              <CalendarPlusIcon /> Agendar ação
            </LinkButton>
            <LinkButton href={`/perimetros/${p.id}/editar`} variant="secondary">
              <PencilIcon /> Editar
            </LinkButton>
          </div>
        )}
      </div>

      {p.imageId ? (
        <a href={uploadUrl(p.imageId)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-input" title="Abrir em tamanho real">
          <UploadImage id={p.imageId} alt={`Vista de cima: ${p.name}`} className="w-full" />
        </a>
      ) : (
        <p className="rounded-card bg-card px-5 py-5 text-base text-muted-foreground">Sem imagem.</p>
      )}
    </FadeIn>
  );
}
