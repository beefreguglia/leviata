import Link from "next/link";
import { ChevronRightIcon, IdCardIcon, PlusIcon, SearchIcon } from "@/components/icons";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { DOSSIER_STATUS, RISK } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DossierFields } from "./dossier-fields";
import { createDossier } from "./actions";

export const metadata = { title: "Dossiê" };

export default async function DossiePage({ searchParams }: PageProps<"/dossie">) {
  const viewer = await requireViewer("dossie.ver");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const contains = { contains: q, mode: "insensitive" as const };
  const where: Prisma.DossierWhereInput = q
    ? { OR: [{ name: contains }, { nickname: contains }, { passport: contains }, { phone: contains }, { vehicles: { some: { plate: contains } } }] }
    : {};
  const [dossiers, factions] = await Promise.all([
    db.dossier.findMany({ where, include: { faction: true, vehicles: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Dossiê"
        description="Pessoas da cidade, placas e vínculos. Acesso restrito à investigação."
        actions={
          viewer.can("dossie.editar") && (
          <FormDialog
            title="Nova ficha"
            size="lg"
            action={createDossier}
            submitLabel="Criar ficha"
            trigger={
              <Button>
                <PlusIcon /> Nova ficha
              </Button>
            }
          >
            <DossierFields factions={factions} />
          </FormDialog>
          )
        }
      />

      <form role="search" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-500" />
          <Input
            name="q"
            defaultValue={q}
            aria-label="Buscar no dossiê"
            placeholder="Buscar por nome, apelido, ID, telefone ou placa…"
            autoComplete="off"
            spellCheck={false}
            className="bg-card pl-12"
          />
        </div>
        <Button type="submit" variant="secondary" size="lg">
          Buscar
        </Button>
      </form>

      {dossiers.length === 0 ? (
        <EmptyState
          icon={IdCardIcon}
          title={q ? "Nada encontrado" : "Nenhuma ficha ainda"}
          description={q ? `Nenhuma ficha corresponde a “${q}”.` : "Crie a primeira no botão “Nova ficha”."}
        />
      ) : (
        <GroupedList>
          {dossiers.map((d) => (
            <Link key={d.id} href={`/dossie/${d.id}`} data-testid="dossier-row" className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 hover:bg-white/5">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base text-grey-100">
                  {d.name}
                  {d.nickname && <span className="text-muted-foreground"> “{d.nickname}”</span>}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {[d.faction?.name, d.passport && `ID ${d.passport}`, d.vehicles.map((v) => v.plate).join(", ")].filter(Boolean).join(" · ") || "Sem mais dados"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="hidden gap-1.5 sm:flex">
                  <StatusBadge {...DOSSIER_STATUS[d.status]} />
                  <StatusBadge {...RISK[d.threat]} />
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </span>
            </Link>
          ))}
        </GroupedList>
      )}
    </>
  );
}
