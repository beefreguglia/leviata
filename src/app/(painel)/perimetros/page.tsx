import Link from "next/link";
import { PlusIcon, TargetIcon, UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { RISK } from "@/lib/labels";
import { perimeterSlots } from "@/lib/schemas/ops";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { LinkButton } from "@/components/ui/link-button";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Perímetros" };

export default async function PerimetrosPage() {
  const viewer = await requireViewer();
  const perimeters = await db.perimeter.findMany({
    include: { roles: { orderBy: { order: "asc" } }, _count: { select: { events: true } } },
    orderBy: [{ target: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Perímetros"
        description="O plano de cada alvo: funções, rotas de fuga e prints. Base das escalações."
        actions={
          viewer.can("operacoes.gerenciar") && (
            <LinkButton href="/perimetros/novo">
              <PlusIcon /> Novo perímetro
            </LinkButton>
          )
        }
      />
      {perimeters.length === 0 ? (
        <EmptyState icon={TargetIcon} title="Nenhum perímetro ainda" description="Monte o plano de um alvo para usar nas escalações." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {perimeters.map((p) => (
            <StaggerItem key={p.id}>
              <Link href={`/perimetros/${p.id}`} data-testid="perimeter-card" className="flex h-full flex-col overflow-hidden rounded-card bg-card transition-colors hover:bg-grey-700">
                {p.imageIds[0] && <UploadImage id={p.imageIds[0]} alt="" className="aspect-[16/7] w-full" />}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge label={p.target} className="bg-cyan-low text-cyan-light" />
                    <StatusBadge label={RISK[p.difficulty].label.replace("Risco", "Dificuldade")} className={RISK[p.difficulty].className} />
                  </div>
                  <h3 className="text-lg font-bold text-grey-100">{p.name}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {p.roles.map((r) => (
                      <li key={r.id} className="inline-flex h-7 items-center gap-1 rounded-full bg-grey-600 px-3 text-xs font-bold text-grey-100">
                        {r.quantity > 1 && <span className="text-cyan-light">{r.quantity}×</span>} {r.name}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                    <UsersIcon className="size-4" /> {perimeterSlots(p.roles)} vagas
                    {p.minMembers ? ` · mínimo ${p.minMembers}` : ""} · usado em {p._count.events} {p._count.events === 1 ? "evento" : "eventos"}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
