import Link from "next/link";
import { CalendarClockIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon, TruckIcon, UserIcon } from "@/components/icons";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { allBalances } from "@/lib/vault";
import { ORDER_FLOW, money, orderTotal } from "@/lib/finance";
import { planCraft, type CraftRecipe } from "@/lib/crafting";
import { ORDER_STATUS } from "@/lib/labels";
import { fmtAgo, fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { OrderFields } from "./order-fields";
import { createOrder, deleteOrder, deliverOrder, moveOrder, updateOrder } from "./actions";

export const metadata = { title: "Encomendas" };

const include = { item: true, faction: true, assignedTo: true } satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof include }>;
const COLUMNS: OrderStatus[] = ["ABERTA", "PRODUCAO", "PRONTA"];
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = { PRODUCAO: "Começar produção", PRONTA: "Marcar pronta", ABERTA: "Voltar para aberta" };

export default async function EncomendasPage() {
  const viewer = await requireViewer("economia.ver");
  const canManage = viewer.can("financeiro.gerenciar");
  const now = new Date();

  const [active, done, items, factions, members, recipes, balances] = await Promise.all([
    db.order.findMany({ where: { status: { in: COLUMNS } }, include, orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    db.order.findMany({ where: { status: { in: ["ENTREGUE", "CANCELADA"] } }, include, orderBy: { updatedAt: "desc" }, take: 15 }),
    db.item.findMany({ select: { id: true, name: true, unit: true }, orderBy: { name: "asc" } }),
    canManage ? db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage ? db.member.findMany({ where: { status: "ATIVO" }, select: { id: true, rpName: true }, orderBy: { rpName: "asc" } }) : Promise.resolve([]),
    db.recipe.findMany({ include: { inputs: true } }),
    canManage ? allBalances() : Promise.resolve(null),
  ]);
  const itemName = new Map(items.map((i) => [i.id, i]));
  const craftRecipes: CraftRecipe[] = recipes.map((r) => ({ id: r.id, outputItemId: r.outputItemId, outputQty: r.outputQty, minutes: r.minutes, inputs: r.inputs.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) }));
  const openTotal = active.reduce((n, o) => n + orderTotal(o), 0);

  function Card({ o }: { o: OrderRow }) {
    const overdue = o.dueAt && o.dueAt < now;
    const inStock = balances?.items.get(o.itemId) ?? 0;
    let materials: { itemId: string; quantity: number }[] = [];
    try {
      materials = craftRecipes.some((r) => r.outputItemId === o.itemId) ? planCraft(o.itemId, o.quantity, craftRecipes).raw : [];
    } catch {
      materials = [];
    }
    return (
      <article className="flex flex-col gap-3 rounded-card glass-card p-5" data-testid="order-card">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-grey-100">{o.customer}</h3>
            {o.faction && <p className="text-xs text-muted-foreground">{o.faction.name}</p>}
          </div>
          {o.paid ? <StatusBadge label="Pago" className="bg-success-low text-success" /> : <StatusBadge label="A receber" className="bg-grey-600 text-grey-200" />}
        </header>
        <p className="text-lg text-grey-100">
          <strong className="text-primary">{o.quantity}×</strong> {o.item.name}
          {o.unitPrice > 0 && <span className="ml-2 text-sm text-muted-foreground">{money(orderTotal(o))}</span>}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {o.dueAt && (
            <span className={cn("flex items-center gap-1", overdue && "font-bold text-danger-light")}>
              <CalendarClockIcon className="size-4" /> {overdue ? "Atrasada · " : ""}
              {fmtDate(o.dueAt)}
            </span>
          )}
          {o.assignedTo && (
            <span className="flex items-center gap-1">
              <UserIcon className="size-4" /> {o.assignedTo.rpName}
            </span>
          )}
          {balances && (
            <span className={cn(inStock >= o.quantity ? "text-success" : "text-grey-400")}>
              {inStock >= o.quantity ? "✓ tem no baú" : `baú: ${inStock}/${o.quantity}`}
            </span>
          )}
        </div>
        {materials.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-cyan-light">Materiais para fabricar</summary>
            <ul className="mt-2 flex flex-col gap-1" data-testid="order-materials">
              {materials.map((m) => (
                <li key={m.itemId} className="flex justify-between text-grey-300">
                  <span>{itemName.get(m.itemId)?.name}</span>
                  <span className="tabular-nums">
                    {m.quantity.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {o.notes && <p className="text-sm text-grey-300">{o.notes}</p>}
        {canManage && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-grey-700 pt-3">
            {ORDER_FLOW[o.status]
              .filter((s) => s !== "CANCELADA" && s !== "ENTREGUE")
              .map((s) => (
                <ActionForm key={s} action={async () => { "use server"; return moveOrder(o.id, s); }}>
                  <SubmitButton size="sm" variant={s === "ABERTA" ? "ghost" : "secondary"}>
                    {NEXT_LABEL[s as OrderStatus]}
                  </SubmitButton>
                </ActionForm>
              ))}
            {o.status === "PRONTA" && (
              <FormDialog
                title={`Entregar para ${o.customer}`}
                description={`${o.quantity}× ${o.item.name}${o.unitPrice ? ` · ${money(orderTotal(o))}` : ""}`}
                action={deliverOrder.bind(null, o.id)}
                submitLabel="Confirmar entrega"
                trigger={
                  <Button size="sm">
                    <TruckIcon /> Entregar
                  </Button>
                }
              >
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
                  Tirar {o.quantity} {o.item.name} do baú
                  <input type="checkbox" name="takeFromVault" defaultChecked={inStock >= o.quantity} className="size-5 accent-[var(--primary)]" />
                </label>
                <Field label="Pagamento" htmlFor={`pay-${o.id}`} hint="Lança o valor total como entrada no baú.">
                  <NativeSelect id={`pay-${o.id}`} name="payment" defaultValue={o.unitPrice > 0 && !o.paid ? "DINHEIRO_SUJO" : "NAO"}>
                    <option value="NAO">Não lançar no baú</option>
                    <option value="DINHEIRO_SUJO">Entrar como dinheiro sujo</option>
                    <option value="DINHEIRO_LIMPO">Entrar como dinheiro limpo</option>
                  </NativeSelect>
                </Field>
              </FormDialog>
            )}
            <div className="ml-auto flex">
              <FormDialog
                title="Editar encomenda"
                size="lg"
                action={updateOrder.bind(null, o.id)}
                trigger={
                  <Button size="icon-sm" variant="ghost" aria-label={`Editar encomenda de ${o.customer}`}>
                    <PencilIcon />
                  </Button>
                }
              >
                <OrderFields order={o} items={items} factions={factions} members={members} />
              </FormDialog>
              <ConfirmButton
                title={`Cancelar a encomenda de ${o.customer}?`}
                confirmLabel="Cancelar encomenda"
                destructive
                action={moveOrder.bind(null, o.id, "CANCELADA")}
                trigger={
                  <Button size="icon-sm" variant="ghost" aria-label={`Cancelar encomenda de ${o.customer}`}>
                    <Trash2Icon />
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      <PageHeader
        title="Encomendas"
        description={active.length ? `${active.length} em andamento · ${money(openTotal)} a receber` : "Pedidos de clientes e outras facções."}
        actions={
          canManage && (
            <FormDialog
              title="Nova encomenda"
              size="lg"
              action={createOrder}
              submitLabel="Criar encomenda"
              trigger={
                <Button disabled={!items.length}>
                  <PlusIcon /> Nova encomenda
                </Button>
              }
            >
              <OrderFields items={items} factions={factions} members={members} />
            </FormDialog>
          )
        }
      />

      {active.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Nenhuma encomenda"
          description={items.length ? "Registre o primeiro pedido." : "Cadastre os itens em Fabricação primeiro."}
          action={!items.length ? <Link href="/fabricacao" className="text-cyan-light hover:underline">Ir para Fabricação</Link> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {COLUMNS.map((st) => {
              const list = active.filter((o) => o.status === st);
              return (
                <section key={st} className="flex flex-col gap-3" data-testid={`orders-${st}`}>
                  <h2 className="flex items-center gap-2 type-h2 text-grey-300">
                    <StatusBadge {...ORDER_STATUS[st]} /> <span className="tabular-nums text-muted-foreground">{list.length}</span>
                  </h2>
                  {list.length === 0 ? (
                    <p className="rounded-card border-2 border-dashed border-grey-700 px-5 py-6 text-center text-sm text-muted-foreground">Nada aqui</p>
                  ) : (
                    list.map((o) => <Card key={o.id} o={o} />)
                  )}
                </section>
              );
            })}
          </div>
          {done.length > 0 && (
            <GroupedList header="Entregues e canceladas">
              {done.map((o) => (
                <div key={o.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3" data-testid="order-done">
                  <span className={cn("text-base text-grey-100", o.status === "CANCELADA" && "line-through opacity-60")}>
                    {o.customer} · {o.quantity}× {o.item.name}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {o.unitPrice > 0 && money(orderTotal(o))} · {fmtAgo(o.deliveredAt ?? o.updatedAt)}
                    <StatusBadge {...ORDER_STATUS[o.status]} />
                    {canManage && o.status === "CANCELADA" && (
                      <ConfirmButton
                        title="Apagar de vez?"
                        confirmLabel="Apagar"
                        destructive
                        action={deleteOrder.bind(null, o.id)}
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label={`Apagar encomenda de ${o.customer}`}>
                            <Trash2Icon />
                          </Button>
                        }
                      />
                    )}
                  </span>
                </div>
              ))}
            </GroupedList>
          )}
        </div>
      )}
    </>
  );
}
