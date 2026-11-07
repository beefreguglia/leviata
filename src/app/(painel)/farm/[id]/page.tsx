import { notFound } from "next/navigation";
import { ClockIcon, MapPinIcon, PackageIcon, PencilIcon, WrenchIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { RISK } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { uploadUrl } from "@/lib/images";
import { yieldPerHour } from "@/lib/schemas/content";
import { GroupedList, GroupedRow } from "@/components/layout/grouped-list";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";

export default async function FarmGuidePage({ params }: PageProps<"/farm/[id]">) {
  const viewer = await requireViewer("economia.ver");
  const { id } = await params;
  const guide = await db.farmGuide.findUnique({ where: { id }, include: { item: true, author: true } });
  if (!guide) notFound();
  const perHour = yieldPerHour(guide.amountPerRun, guide.minutesPerRun);
  const unit = guide.item?.unit ?? "un";

  return (
    <FadeIn className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {guide.item && <StatusBadge label={guide.item.name} className="bg-cyan-low text-cyan-light" />}
            <StatusBadge {...RISK[guide.risk]} />
          </div>
          <h1 className="text-2xl font-bold leading-shorter text-grey-100 md:text-[2rem]">{guide.title}</h1>
          <p className="text-sm text-muted-foreground">
            Por {guide.author?.rpName ?? "Leviatã"} · atualizado {fmtAgo(guide.updatedAt)}
          </p>
        </div>
        {viewer.can("conteudo.editar") && (
          <LinkButton href={`/farm/${guide.id}/editar`} variant="secondary">
            <PencilIcon /> Editar
          </LinkButton>
        )}
      </div>

      <GroupedList header="Resumo">
        <GroupedRow label={<span className="flex items-center gap-2"><MapPinIcon className="size-4 text-muted-foreground" /> Local</span>}>{guide.location}</GroupedRow>
        <GroupedRow label={<span className="flex items-center gap-2"><PackageIcon className="size-4 text-muted-foreground" /> Rende por rodada</span>}>
          {guide.amountPerRun != null ? `${guide.amountPerRun} ${unit}` : "—"}
        </GroupedRow>
        <GroupedRow label={<span className="flex items-center gap-2"><ClockIcon className="size-4 text-muted-foreground" /> Tempo por rodada</span>}>
          {guide.minutesPerRun != null ? `${guide.minutesPerRun} min` : "—"}
        </GroupedRow>
        {perHour != null && <GroupedRow label="Rendimento estimado">~{perHour.toLocaleString("pt-BR")} {unit}/hora</GroupedRow>}
        {guide.requirements && (
          <GroupedRow label={<span className="flex items-center gap-2"><WrenchIcon className="size-4 text-muted-foreground" /> Precisa de</span>}>
            {guide.requirements}
          </GroupedRow>
        )}
      </GroupedList>

      {guide.imageIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-grey-200">Prints</h2>
          <div className="grid gap-3 sm:grid-cols-2" data-testid="farm-images">
            {guide.imageIds.map((imgId, i) => (
              <a key={imgId} href={uploadUrl(imgId)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-input" aria-label={`Abrir print ${i + 1}`}>
                <UploadImage id={imgId} alt={`Print ${i + 1} de ${guide.title}`} className="aspect-video w-full transition-transform duration-300 hover:scale-[1.02]" />
              </a>
            ))}
          </div>
        </section>
      )}

      <GroupedList header="Como farmar">
        <div className="px-6 py-6">
          <Markdown>{guide.howTo}</Markdown>
        </div>
      </GroupedList>
    </FadeIn>
  );
}
