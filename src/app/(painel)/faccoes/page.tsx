import Link from "next/link";
import { PlusIcon, SwordsIcon } from "@/components/icons";
import type { FactionRelation } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { FACTION_RELATION } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion";
import { FactionAvatar } from "./faction-avatar";
import { FactionFields } from "./faction-fields";
import { createFaction } from "./actions";

export const metadata = { title: "Facções" };

const ORDER: FactionRelation[] = ["GUERRA", "INIMIGA", "TENSA", "NEUTRA", "ALIADA"];

export default async function FaccoesPage({ searchParams }: PageProps<"/faccoes">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const rel = typeof sp.relacao === "string" && sp.relacao in FACTION_RELATION ? (sp.relacao as FactionRelation) : null;
  const showInactive = sp.inativas === "1";

  const all = await db.faction.findMany({
    include: { events: { orderBy: { happenedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  const visible = all.filter((f) => (showInactive || f.isActive) && (!rel || f.relation === rel));
  visible.sort((a, b) => ORDER.indexOf(a.relation) - ORDER.indexOf(b.relation) || a.name.localeCompare(b.name));
  const counts = Object.fromEntries(ORDER.map((r) => [r, all.filter((f) => f.isActive && f.relation === r).length]));
  const inactive = all.filter((f) => !f.isActive).length;

  return (
    <>
      <PageHeader
        title="Facções"
        description="Quem é quem na cidade e como estamos com cada um."
        actions={
          viewer.can("conteudo.editar") && (
            <FormDialog
              title="Nova facção"
              size="lg"
              action={createFaction}
              submitLabel="Cadastrar"
              trigger={
                <Button>
                  <PlusIcon /> Nova facção
                </Button>
              }
            >
              <FactionFields />
            </FormDialog>
          )
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Resumo das relações">
        {ORDER.map((r) => {
          const info = FACTION_RELATION[r];
          const active = rel === r;
          return (
            <Link
              key={r}
              href={active ? "/faccoes" : `/faccoes?relacao=${r}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex flex-col gap-2 rounded-card bg-card p-4 ring-2 transition-colors hover:bg-grey-700",
                active ? "ring-primary" : "ring-transparent",
              )}
            >
              <span className="flex items-center gap-2 text-sm text-grey-200">
                <span className={cn("size-2.5 rounded-full", info.dot)} /> {info.label}
              </span>
              <span className="type-stat text-grey-100">{counts[r]}</span>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SwordsIcon}
          title={all.length ? "Nenhuma facção com esse filtro" : "Nenhuma facção cadastrada"}
          description={all.length ? undefined : "Cadastre as facções da cidade para acompanhar alianças e conflitos."}
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
          {visible.map((f) => (
            <StaggerItem key={f.id}>
              <Link
                href={`/faccoes/${f.id}`}
                data-testid="faction-card"
                className={cn("flex h-full items-start gap-4 rounded-card bg-card p-5 transition-colors hover:bg-grey-700", !f.isActive && "opacity-60")}
              >
                <FactionAvatar name={f.name} tag={f.tag} color={f.color} logoId={f.logoId} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-lg font-bold text-grey-100">{f.name}</h3>
                    {f.tag && <span className="text-sm text-muted-foreground">[{f.tag}]</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge {...FACTION_RELATION[f.relation]} />
                    {f.kind && <StatusBadge label={f.kind} className="bg-grey-600 text-grey-100" />}
                    {!f.isActive && <StatusBadge label="Inativa" className="bg-grey-600 text-grey-300" />}
                  </div>
                  {f.territory && <p className="truncate text-sm text-grey-300">📍 {f.territory}</p>}
                  {f.events[0] && (
                    <p className="truncate text-xs text-muted-foreground">
                      Último: {f.events[0].title} · {fmtAgo(f.events[0].happenedAt)}
                    </p>
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {inactive > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {showInactive ? (
            <Link href="/faccoes" className="text-cyan-light hover:underline">Esconder inativas</Link>
          ) : (
            <Link href="/faccoes?inativas=1" className="text-cyan-light hover:underline">Mostrar {inactive} inativa(s)</Link>
          )}
        </p>
      )}
    </>
  );
}
