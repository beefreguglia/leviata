import Link from "next/link";
import { ArrowDownLeftIcon, ArrowUpRightIcon, CheckIcon, PackageIcon, PlusIcon, Undo2Icon, WalletIcon, XIcon } from "@/components/icons";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { allBalances } from "@/lib/vault";
import { money } from "@/lib/finance";
import { VAULT_ASSET, VAULT_STATUS } from "@/lib/labels";
import { fmtAgo, fmtDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, NativeSelect } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/motion";
import { ChartCard } from "@/components/charts/chart-card";
import { LineTrendChart } from "@/components/charts/charts";
import { vaultHistory } from "@/lib/economy-stats";
import { MoveFields } from "./move-fields";
import { cancelMyDelivery, confirmMove, deliverFarm, registerMove, reverseMove } from "./actions";

export const metadata = { title: "Baú" };

const include = { item: true, member: true, createdBy: true } satisfies Prisma.VaultTransactionInclude;
type MoveRow = Prisma.VaultTransactionGetPayload<{ include: typeof include }>;

const BALANCE_SERIES = [
  { key: "dirty", label: "Sujo", color: "var(--chart-1)" },
  { key: "clean", label: "Limpo", color: "var(--chart-2)" },
];

function MoveLine({ m, actions }: { m: MoveRow; actions?: React.ReactNode }) {
  const isIn = m.kind === "ENTRADA";
  const what = m.asset === "ITEM" ? `${m.quantity.toLocaleString("pt-BR")}× ${m.item?.name ?? ""}` : `${money(m.quantity)} ${VAULT_ASSET[m.asset].short.toLowerCase()}`;
  return (
    <div className="flex min-h-14 items-center gap-3 px-5 py-3" data-testid="vault-move">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", isIn ? "bg-success-low text-success" : "bg-danger-low text-danger-light")}>
        {isIn ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-base text-grey-100", m.status === "ESTORNADA" && "line-through opacity-60")}>
          <strong className="tabular-nums">{isIn ? "+" : "−"} {what}</strong>
          {m.member && <span className="text-grey-300"> · {m.member.rpName}</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {m.reason ?? "Sem motivo"} · {fmtAgo(m.createdAt)}
          {m.createdBy && m.createdBy.id !== m.member?.id && ` · lançado por ${m.createdBy.rpName}`}
        </p>
      </div>
      {m.status !== "CONFIRMADA" && <StatusBadge {...VAULT_STATUS[m.status]} />}
      {actions}
    </div>
  );
}

export default async function BauPage() {
  const viewer = await requireViewer("economia.ver");
  const canManage = viewer.can("financeiro.gerenciar");
  const items = await db.item.findMany({ orderBy: { name: "asc" } });

  const [balances, pending, history, mine, members, balanceHistory] = await Promise.all([
    canManage ? allBalances() : Promise.resolve(null),
    canManage ? db.vaultTransaction.findMany({ where: { status: "PENDENTE" }, include, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    canManage ? db.vaultTransaction.findMany({ where: { status: { not: "PENDENTE" } }, include, orderBy: { createdAt: "desc" }, take: 40 }) : Promise.resolve([]),
    viewer.member ? db.vaultTransaction.findMany({ where: { memberId: viewer.member.id }, include, orderBy: { createdAt: "desc" }, take: 15 }) : Promise.resolve([]),
    canManage ? db.member.findMany({ where: { status: { not: "EXPULSO" } }, select: { id: true, rpName: true }, orderBy: { rpName: "asc" } }) : Promise.resolve([]),
    canManage ? vaultHistory() : Promise.resolve(null),
  ]);
  const stock = balances ? items.map((i) => ({ ...i, qty: balances.items.get(i.id) ?? 0 })).filter((i) => i.qty !== 0) : [];

  const deliverDialog = (
    <FormDialog
      title="Entregar farm no baú"
      description={canManage ? "Como você é da gerência, já entra confirmado." : "A gerência confere e a entrega passa a contar na sua meta."}
      action={deliverFarm}
      submitLabel="Entregar"
      trigger={
        <Button variant={canManage ? "secondary" : "default"}>
          <PackageIcon /> Entregar farm
        </Button>
      }
    >
      <Field label="Item" htmlFor="dl-item">
        <NativeSelect id="dl-item" name="itemId" required defaultValue="">
          <option value="">Escolha…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Quantidade" htmlFor="dl-qty">
        <Input id="dl-qty" name="quantity" type="number" min={1} required inputMode="numeric" />
      </Field>
      <Field label="Observação (opcional)" htmlFor="dl-reason">
        <Input id="dl-reason" name="reason" placeholder="Ex.: farm de sexta" />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Baú"
        description={canManage ? "Dinheiro, estoque e tudo que entrou e saiu." : "Entregue seu farm no baú — conta na sua meta da semana."}
        actions={
          <>
            {deliverDialog}
            {canManage && (
              <FormDialog
                title="Registrar movimentação"
                action={registerMove}
                submitLabel="Registrar"
                trigger={
                  <Button>
                    <PlusIcon /> Registrar
                  </Button>
                }
              >
                <MoveFields items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))} members={members.map((m) => ({ id: m.id, name: m.rpName }))} />
              </FormDialog>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-10">
        {balances && (
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Dinheiro sujo", value: balances.dirty, tone: "bg-danger-low text-danger-light" },
              { label: "Dinheiro limpo", value: balances.clean, tone: "bg-success-low text-success" },
            ].map((b) => (
              <StaggerItem key={b.label}>
                <div className="flex flex-col gap-4 rounded-card glass-card p-6" data-testid={`balance-${b.label}`}>
                  <span className={cn("flex size-10 items-center justify-center rounded-md", b.tone)}>
                    <WalletIcon className="size-5" />
                  </span>
                  <span>
                    <span className="block type-stat text-grey-100">{money(b.value)}</span>
                    <span className="text-sm text-muted-foreground">{b.label}</span>
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {balanceHistory && (
          <ChartCard
            testId="chart-bau-saldo"
            title="Saldo nos últimos 30 dias"
            series={BALANCE_SERIES}
            empty={balanceHistory.length === 0}
            table={{ columns: ["Dia", "Sujo", "Limpo"], rows: balanceHistory.map((p) => [p.label, money(p.dirty), money(p.clean)]) }}
          >
            <LineTrendChart data={balanceHistory} xKey="label" series={BALANCE_SERIES} />
          </ChartCard>
        )}

        {canManage && pending.length > 0 && (
          <GroupedList header={`Entregas para conferir · ${pending.length}`} footer="Confira no jogo antes de confirmar. Só entregas confirmadas contam no estoque e nas metas.">
            {pending.map((m) => (
              <MoveLine
                key={m.id}
                m={m}
                actions={
                  <div className="flex shrink-0 gap-1">
                    <ActionForm action={async () => { "use server"; return confirmMove(m.id); }}>
                      <SubmitButton size="sm" variant="secondary">
                        <CheckIcon className="text-success" /> Conferir
                      </SubmitButton>
                    </ActionForm>
                    <ConfirmButton
                      title="Recusar esta entrega?"
                      confirmLabel="Recusar"
                      destructive
                      action={reverseMove.bind(null, m.id)}
                      trigger={
                        <Button size="icon-sm" variant="ghost" aria-label="Recusar entrega">
                          <XIcon />
                        </Button>
                      }
                    />
                  </div>
                }
              />
            ))}
          </GroupedList>
        )}

        {canManage && (
          <GroupedList header="Estoque de itens">
            {stock.length === 0 ? (
              <p className="px-5 py-4 text-base text-muted-foreground">Nenhum item guardado.</p>
            ) : (
              stock.map((i) => (
                <div key={i.id} className="flex min-h-12 items-center justify-between px-5 py-3" data-testid="stock-row">
                  <span className="text-base text-grey-100">{i.name}</span>
                  <span className="text-base font-bold tabular-nums text-grey-100">
                    {i.qty.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </GroupedList>
        )}

        <GroupedList header="Minhas entregas e retiradas" footer={<Link href="/metas" className="text-cyan-light hover:underline">Ver minhas metas da semana</Link>}>
          {mine.length === 0 ? (
            <p className="px-5 py-4 text-base text-muted-foreground">Nada ainda.</p>
          ) : (
            mine.map((m) => (
              <MoveLine
                key={m.id}
                m={m}
                actions={
                  m.status === "PENDENTE" && m.createdById === viewer.member?.id ? (
                    <ActionForm action={async () => { "use server"; return cancelMyDelivery(m.id); }}>
                      <SubmitButton size="sm" variant="ghost">
                        Cancelar
                      </SubmitButton>
                    </ActionForm>
                  ) : undefined
                }
              />
            ))
          )}
        </GroupedList>

        {canManage &&
          (history.length === 0 ? (
            <EmptyState icon={WalletIcon} title="Nenhuma movimentação" description="Registre a primeira entrada no botão acima." />
          ) : (
            <GroupedList header="Histórico" footer="Últimas 40 movimentações.">
              {history.map((m) => (
                <MoveLine
                  key={m.id}
                  m={m}
                  actions={
                    m.status === "CONFIRMADA" ? (
                      <ConfirmButton
                        title="Estornar esta movimentação?"
                        description={`Ela deixa de contar no saldo. (${fmtDateTime(m.createdAt)})`}
                        confirmLabel="Estornar"
                        destructive
                        action={reverseMove.bind(null, m.id)}
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label="Estornar">
                            <Undo2Icon />
                          </Button>
                        }
                      />
                    ) : undefined
                  }
                />
              ))}
            </GroupedList>
          ))}
      </div>
    </>
  );
}
