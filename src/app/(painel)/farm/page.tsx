import Link from "next/link";
import { ClockIcon, MapPinIcon, PlusIcon, SproutIcon } from "lucide-react";
import type { Risk } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { RISK } from "@/lib/labels";
import { yieldPerHour } from "@/lib/schemas/content";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Farm" };

export default async function FarmPage({ searchParams }: PageProps<"/farm">) {
  const viewer = await requireViewer("economia.ver");
  const sp = await searchParams;
  const risk = typeof sp.risco === "string" && sp.risco in RISK ? (sp.risco as Risk) : null;
  const item = typeof sp.item === "string" && sp.item ? sp.item : null;

  const [guides, items] = await Promise.all([
    db.farmGuide.findMany({
      where: { ...(risk && { risk }), ...(item && { itemId: item }) },
      include: { item: true },
      orderBy: { title: "asc" },
    }),
    db.item.findMany({ where: { farmGuides: { some: {} } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Farm"
        description="Onde e como farmar cada coisa — e quanto rende."
        actions={
          viewer.can("conteudo.editar") && (
            <LinkButton href="/farm/novo">
              <PlusIcon /> Novo guia
            </LinkButton>
          )
        }
      />

      <form className="mb-8 flex flex-col gap-3 sm:flex-row">
        <NativeSelect name="item" defaultValue={item ?? ""} className="bg-card sm:w-56" aria-label="Filtrar por item">
          <option value="">Todos os itens</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="risco" defaultValue={risk ?? ""} className="bg-card sm:w-48" aria-label="Filtrar por risco">
          <option value="">Qualquer risco</option>
          {Object.entries(RISK).map(([v, { label }]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary" size="lg">
          Filtrar
        </Button>
      </form>

      {guides.length === 0 ? (
        <EmptyState icon={SproutIcon} title="Nenhum guia de farm" description="Registre os farms que a fac conhece para todo mundo render mais." />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => {
            const perHour = yieldPerHour(g.amountPerRun, g.minutesPerRun);
            return (
              <StaggerItem key={g.id}>
                <Link href={`/farm/${g.id}`} data-testid="farm-card" className="group flex h-full flex-col overflow-hidden rounded-card bg-card transition-colors hover:bg-grey-700">
                  {g.imageIds[0] ? (
                    <UploadImage id={g.imageIds[0]} alt="" className="aspect-video w-full" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-input">
                      <SproutIcon className="size-8 text-grey-600" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex flex-wrap gap-1.5">
                      {g.item && <StatusBadge label={g.item.name} className="bg-cyan-low text-cyan-light" />}
                      <StatusBadge {...RISK[g.risk]} />
                    </div>
                    <h3 className="text-lg font-bold text-grey-100">{g.title}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-grey-300">
                      <MapPinIcon className="size-4 shrink-0 text-muted-foreground" /> {g.location}
                    </p>
                    {perHour != null && (
                      <p className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-grey-200">
                        <ClockIcon className="size-4 text-muted-foreground" />
                        <strong className="text-grey-100">~{perHour.toLocaleString("pt-BR")}</strong> {g.item?.unit ?? "un"}/hora
                      </p>
                    )}
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
