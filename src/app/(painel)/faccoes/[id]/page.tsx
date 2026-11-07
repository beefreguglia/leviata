import Link from "next/link";
import { notFound } from "next/navigation";
import { CrownIcon, MapPinIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { db } from "@/lib/db";
import { money } from "@/lib/finance";
import { requireViewer } from "@/lib/session";
import { FACTION_EVENT_KIND, FACTION_RELATION } from "@/lib/labels";
import { fmtAgo, fmtDate, toDateInputBRT } from "@/lib/dates";
import { FACTION_EVENT_KINDS } from "@/lib/schemas/content";
import { cn } from "@/lib/utils";
import { GroupedList } from "@/components/layout/grouped-list";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field, NativeSelect } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/motion";
import { FactionAvatar } from "../faction-avatar";
import { FactionFields } from "../faction-fields";
import { addFactionEvent, deleteFaction, deleteFactionEvent, updateFaction } from "../actions";

export default async function FactionPage({ params }: PageProps<"/faccoes/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const faction = await db.faction.findUnique({
    where: { id },
    include: { events: { include: { author: true }, orderBy: { happenedAt: "desc" } } },
  });
  if (!faction) notFound();
  const canEdit = viewer.can("conteudo.editar");
  // negócios com a facção: só quem vê a economia
  const sales = viewer.can("economia.ver")
    ? await db.sale.findMany({ where: { factionId: id, cancelledAt: null }, include: { item: true }, orderBy: { createdAt: "desc" }, take: 10 })
    : null;
  const salesTotal = sales?.reduce((n, s) => n + s.quantity * s.unitPrice, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <FadeIn className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start">
        <FactionAvatar name={faction.name} tag={faction.tag} color={faction.color} logoId={faction.logoId} className="size-20 text-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="type-h1 text-grey-100">
            {faction.name} {faction.tag && <span className="text-lg font-normal text-muted-foreground">[{faction.tag}]</span>}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge {...FACTION_RELATION[faction.relation]} />
            {faction.kind && <StatusBadge label={faction.kind} className="bg-grey-600 text-grey-100" />}
            {!faction.isActive && <StatusBadge label="Inativa" className="bg-grey-600 text-grey-300" />}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey-300">
            {faction.leader && (
              <span className="flex items-center gap-1.5">
                <CrownIcon className="size-4 text-muted-foreground" /> {faction.leader}
              </span>
            )}
            {faction.territory && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="size-4 text-muted-foreground" /> {faction.territory}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <FormDialog
              title={`Editar ${faction.name}`}
              size="lg"
              action={updateFaction.bind(null, faction.id)}
              trigger={
                <Button variant="secondary">
                  <PencilIcon /> Editar
                </Button>
              }
            >
              <FactionFields faction={faction} />
            </FormDialog>
            <ConfirmButton
              title={`Apagar ${faction.name}?`}
              description="O histórico dela também será apagado."
              confirmLabel="Apagar"
              destructive
              action={deleteFaction.bind(null, faction.id)}
              trigger={
                <Button variant="ghost" size="icon" aria-label={`Apagar ${faction.name}`}>
                  <Trash2Icon />
                </Button>
              }
            />
          </div>
        )}
      </FadeIn>

      <div className="flex flex-col gap-10">
        {faction.description && (
          <GroupedList header="O que sabemos">
            <div className="px-6 py-6">
              <Markdown>{faction.description}</Markdown>
            </div>
          </GroupedList>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-h2 text-grey-300">Histórico com a Leviatã</h2>
            {canEdit && (
              <FormDialog
                title="Registrar no histórico"
                action={addFactionEvent.bind(null, faction.id)}
                submitLabel="Registrar"
                trigger={
                  <Button size="sm" variant="secondary">
                    <PlusIcon /> Registrar
                  </Button>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tipo" htmlFor="ev-kind">
                    <NativeSelect id="ev-kind" name="kind" defaultValue="CONFLITO">
                      {FACTION_EVENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {FACTION_EVENT_KIND[k].label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Quando" htmlFor="ev-date">
                    <Input id="ev-date" name="happenedAt" type="date" defaultValue={toDateInputBRT(new Date())} />
                  </Field>
                </div>
                <Field label="O que aconteceu" htmlFor="ev-title">
                  <Input id="ev-title" name="title" required placeholder="Ex.: Troca de tiro na praça" />
                </Field>
                <Field label="Detalhes (opcional)" htmlFor="ev-desc">
                  <Textarea id="ev-desc" name="description" rows={3} />
                </Field>
              </FormDialog>
            )}
          </div>
          {faction.events.length === 0 ? (
            <p className="rounded-card bg-card px-5 py-5 text-base text-muted-foreground">Nada registrado ainda.</p>
          ) : (
            <ol className="flex flex-col gap-0 border-l-2 border-grey-700 pl-6" data-testid="faction-timeline">
              {faction.events.map((e) => (
                <li key={e.id} className="relative pb-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute top-1.5 -left-[31px] size-3 rounded-full ring-4 ring-background",
                      e.kind === "CONFLITO" || e.kind === "TRAICAO" ? "bg-danger-light" : e.kind === "ACORDO" || e.kind === "NEGOCIO" ? "bg-success" : e.kind === "RELACAO" ? "bg-primary" : "bg-grey-400",
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(e.happenedAt)} · {FACTION_EVENT_KIND[e.kind].label}
                        {e.author && ` · ${e.author.rpName}`}
                      </p>
                      <p className="text-base font-medium text-grey-100">{e.title}</p>
                      {e.description && <p className="text-sm whitespace-pre-wrap text-grey-300">{e.description}</p>}
                    </div>
                    {canEdit && (
                      <ConfirmButton
                        title="Remover do histórico?"
                        confirmLabel="Remover"
                        destructive
                        action={deleteFactionEvent.bind(null, e.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Remover ${e.title}`}>
                            <XIcon />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {sales && (
        <section className="mt-10" data-testid="faction-sales">
          <GroupedList
            header={`Vendas para ${faction.name}${sales.length ? ` · ${money(salesTotal)}` : ""}`}
            action={
              <Link href="/vendas?comprador=faccao" className="text-sm text-cyan-light hover:underline">
                Ver todas
              </Link>
            }
          >
            {sales.length === 0 ? (
              <p className="px-5 py-4 text-base text-muted-foreground">Nenhuma venda para essa facção ainda.</p>
            ) : (
              sales.map((s) => (
                <div key={s.id} className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 text-base">
                  <span className="text-grey-100">
                    {s.quantity.toLocaleString("pt-BR")}× {s.item.name}
                    <span className="text-sm text-muted-foreground"> · {fmtAgo(s.createdAt)}</span>
                  </span>
                  <strong className="tabular-nums text-grey-100">{money(s.quantity * s.unitPrice)}</strong>
                </div>
              ))
            )}
          </GroupedList>
        </section>
      )}
    </div>
  );
}
