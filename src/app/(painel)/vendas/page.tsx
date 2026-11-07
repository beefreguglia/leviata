import Link from "next/link";
import { HandCoinsIcon, PlusIcon, UndoIcon } from "@/components/icons";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { allBalances } from "@/lib/vault";
import { money, weekRangeBRT } from "@/lib/finance";
import { VAULT_ASSET } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaleFields } from "./sale-fields";
import { cancelSale, createSale } from "./actions";

export const metadata = { title: "Vendas" };

const FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "faccao", label: "Facções" },
  { key: "player", label: "Players" },
] as const;

export default async function VendasPage({ searchParams }: PageProps<"/vendas">) {
  const viewer = await requireViewer("economia.ver");
  const canManage = viewer.can("financeiro.gerenciar");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.comprador)?.key ?? "todas";
  const where: Prisma.SaleWhereInput = filter === "faccao" ? { buyerKind: "FACCAO" } : filter === "player" ? { buyerKind: "PLAYER" } : {};
  const week = weekRangeBRT();

  const [sales, weekSales, items, factions, members, balances] = await Promise.all([
    db.sale.findMany({ where, include: { item: true, seller: true, faction: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.sale.findMany({ where: { cancelledAt: null, createdAt: { gte: week.from, lt: week.to } }, select: { quantity: true, unitPrice: true, payment: true, buyerKind: true } }),
    canManage ? db.item.findMany({ select: { id: true, name: true, unit: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage ? db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage ? db.member.findMany({ where: { status: "ATIVO" }, select: { id: true, rpName: true }, orderBy: { rpName: "asc" } }) : Promise.resolve([]),
    canManage ? allBalances() : Promise.resolve(null),
  ]);

  const sum = (rows: typeof weekSales) => rows.reduce((n, s) => n + s.quantity * s.unitPrice, 0);
  const weekDirty = sum(weekSales.filter((s) => s.payment === "DINHEIRO_SUJO"));
  const weekClean = sum(weekSales.filter((s) => s.payment === "DINHEIRO_LIMPO"));
  const weekFactions = weekSales.filter((s) => s.buyerKind === "FACCAO").length;

  return (
    <>
      <PageHeader
        title="Vendas"
        description="O que a fac vendeu para outras facções e para players. Sai do baú e o dinheiro entra na hora."
        actions={
          canManage && (
            <FormDialog
              title="Nova venda"
              size="lg"
              action={createSale}
              submitLabel="Registrar venda"
              trigger={
                <Button>
                  <PlusIcon /> Nova venda
                </Button>
              }
            >
              <SaleFields
                items={items.map((i) => ({ ...i, stock: balances?.items.get(i.id) ?? 0 }))}
                factions={factions}
                members={members.map((m) => ({ id: m.id, name: m.rpName }))}
                me={viewer.member?.id}
              />
            </FormDialog>
          )
        }
      />

      <section aria-label="Resumo da semana" className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Vendas na semana", value: String(weekSales.length) },
          { label: "Para facções", value: String(weekFactions) },
          { label: "Sujo na semana", value: money(weekDirty) },
          { label: "Limpo na semana", value: money(weekClean) },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-card bg-card p-5">
            <span className="type-stat text-grey-100">{s.value}</span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </section>

      <nav aria-label="Filtrar por comprador" className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todas" ? "/vendas" : `/vendas?comprador=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold transition-colors",
              filter === f.key ? "bg-cyan-low text-cyan-light" : "bg-card text-grey-300 hover:bg-grey-700",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {sales.length === 0 ? (
        <EmptyState icon={HandCoinsIcon} title="Nenhuma venda ainda" description={canManage ? "Registre no botão “Nova venda”." : "As vendas da fac aparecem aqui."} />
      ) : (
        <GroupedList>
          {sales.map((s) => {
            const total = s.quantity * s.unitPrice;
            const cancelled = Boolean(s.cancelledAt);
            return (
              <div key={s.id} data-testid="sale-row" className={cn("flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between", cancelled && "opacity-60")}>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-base text-grey-100">
                    <strong className={cn(cancelled && "line-through")}>
                      {s.quantity.toLocaleString("pt-BR")}× {s.item.name}
                    </strong>
                    <span className="text-muted-foreground">para</span>
                    {s.faction ? (
                      <Link href={`/faccoes/${s.faction.id}`} className="font-bold text-cyan-light hover:underline">
                        {s.buyerName}
                      </Link>
                    ) : (
                      <span className="font-bold">{s.buyerName}</span>
                    )}
                    {s.buyerPassport && <span className="text-sm text-muted-foreground">#{s.buyerPassport}</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <StatusBadge
                      label={s.buyerKind === "FACCAO" ? "Facção" : "Player"}
                      className={s.buyerKind === "FACCAO" ? "bg-cyan-low text-cyan-light" : "bg-grey-600 text-grey-100"}
                    />
                    {cancelled && <StatusBadge label="Cancelada" className="bg-danger-low text-danger-light" />}
                    {s.seller ? `${s.seller.rpName} · ` : ""}
                    {fmtAgo(s.createdAt)}
                    {!s.fromVault && " · sem tirar do baú"}
                    {s.cancelReason && ` · ${s.cancelReason}`}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-right">
                    <strong className={cn("block text-base tabular-nums text-grey-100", cancelled && "line-through")}>{money(total)}</strong>
                    <span className="text-xs text-muted-foreground">{VAULT_ASSET[s.payment].short}</span>
                  </span>
                  {canManage && !cancelled && (
                    <FormDialog
                      title="Cancelar venda?"
                      description="O item volta para o baú e o dinheiro sai. Fica registrado no histórico."
                      action={cancelSale.bind(null, s.id)}
                      submitLabel="Cancelar venda"
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Cancelar venda para ${s.buyerName}`} title="Cancelar venda">
                          <UndoIcon />
                        </Button>
                      }
                    >
                      <Field label="Motivo (opcional)" htmlFor={`cancel-${s.id}`}>
                        <Input id={`cancel-${s.id}`} name="reason" placeholder="Ex.: lançado errado" />
                      </Field>
                    </FormDialog>
                  )}
                </div>
              </div>
            );
          })}
        </GroupedList>
      )}
    </>
  );
}
