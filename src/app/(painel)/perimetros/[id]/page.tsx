import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlusIcon, MapPinIcon, PencilIcon, UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { RISK } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { uploadUrl } from "@/lib/images";
import { perimeterSlots } from "@/lib/schemas/ops";
import { GroupedList } from "@/components/layout/grouped-list";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { FadeIn } from "@/components/motion";

export default async function PerimeterPage({ params }: PageProps<"/perimetros/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const p = await db.perimeter.findUnique({ where: { id }, include: { roles: { orderBy: { order: "asc" } }, pin: true, author: true } });
  if (!p) notFound();
  const canManage = viewer.can("operacoes.gerenciar");

  return (
    <FadeIn className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge label={p.target} className="bg-cyan-low text-cyan-light" />
            <StatusBadge label={RISK[p.difficulty].label.replace("Risco", "Dificuldade")} className={RISK[p.difficulty].className} />
          </div>
          <h1 className="text-2xl font-bold leading-shorter text-grey-100 md:text-[2rem]">{p.name}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UsersIcon className="size-4" /> {perimeterSlots(p.roles)} vagas{p.minMembers ? ` · mínimo ${p.minMembers}` : ""}
            </span>
            {p.pin && (
              <Link href={`/mapa?pin=${p.pin.id}`} className="flex items-center gap-1.5 text-cyan-light hover:underline">
                <MapPinIcon className="size-4" /> {p.pin.title}
              </Link>
            )}
            <span>Atualizado {fmtAgo(p.updatedAt)}{p.author ? ` por ${p.author.rpName}` : ""}</span>
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

      <GroupedList header="Funções">
        {p.roles.map((r) => (
          <div key={r.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3" data-testid="perimeter-role">
            <div className="flex flex-col">
              <span className="text-base font-medium text-grey-100">{r.name}</span>
              {r.notes && <span className="text-sm text-muted-foreground">{r.notes}</span>}
            </div>
            <span className="text-base font-bold tabular-nums text-cyan-light">{r.quantity}×</span>
          </div>
        ))}
      </GroupedList>

      <GroupedList header="Plano">
        <div className="px-6 py-6">
          <Markdown>{p.plan}</Markdown>
        </div>
      </GroupedList>

      {p.escapeRoutes && (
        <GroupedList header="Rotas de fuga">
          <div className="px-6 py-6">
            <Markdown>{p.escapeRoutes}</Markdown>
          </div>
        </GroupedList>
      )}

      {p.imageIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-grey-200">Prints</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {p.imageIds.map((imgId, i) => (
              <a key={imgId} href={uploadUrl(imgId)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-input">
                <UploadImage id={imgId} alt={`Print ${i + 1} de ${p.name}`} className="aspect-video w-full" />
              </a>
            ))}
          </div>
        </section>
      )}
    </FadeIn>
  );
}
