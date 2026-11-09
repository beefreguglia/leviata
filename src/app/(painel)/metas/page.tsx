import { PencilIcon, PlusIcon, TargetIcon, Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { weeklyGoals } from "@/lib/goals";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, NativeSelect } from "@/components/forms/fields";
import { PresenceAvatar } from "@/components/presence-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/motion";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrendChart, RankedBars } from "@/components/charts/charts";
import { memberGoalPct } from "@/lib/economy-charts";
import { goalHistory } from "@/lib/economy-stats";
import { createGoal, deleteGoal, updateGoalQuantity } from "./actions";

export const metadata = { title: "Metas de farm" };

function Bar({ pct, complete }: { pct: number; complete: boolean }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-grey-700" aria-hidden="true">
      <span className={cn("block h-full rounded-full transition-[width]", complete ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
    </span>
  );
}

export default async function MetasPage() {
  const viewer = await requireViewer("economia.ver");
  const canManage = viewer.can("financeiro.gerenciar");
  const [{ from, to, goals, items, rows }, allItems, ranks, completion] = await Promise.all([
    weeklyGoals(),
    canManage ? db.item.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage ? db.rank.findMany({ orderBy: { order: "asc" } }) : Promise.resolve([]),
    goalHistory(),
  ]);
  const memberPct = memberGoalPct(rows);
  const me = rows.find((r) => r.member.id === viewer.member?.id);
  const lastDay = new Date(to.getTime() - 1);
  // dispensados (ausência de 7+ dias na semana) não entram na conta
  const doneCount = rows.filter((r) => r.hasGoals && !r.exempt && r.complete).length;
  const withGoals = rows.filter((r) => r.hasGoals && !r.exempt).length;

  return (
    <>
      <PageHeader
        title="Metas de farm"
        description={`Semana de ${fmtDate(from)} a ${fmtDate(lastDay)}. Contam as entregas conferidas no baú.`}
        actions={
          canManage && (
            <FormDialog
              title="Nova meta semanal"
              action={createGoal}
              submitLabel="Criar meta"
              trigger={
                <Button>
                  <PlusIcon /> Nova meta
                </Button>
              }
            >
              <Field label="Item" htmlFor="g-item">
                <NativeSelect id="g-item" name="itemId" required defaultValue="">
                  <option value="">Escolha…</option>
                  {allItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantidade por semana" htmlFor="g-qty">
                  <Input id="g-qty" name="quantity" type="number" min={1} required />
                </Field>
                <Field label="Vale para" htmlFor="g-rank" hint="Meta da patente substitui a geral.">
                  <NativeSelect id="g-rank" name="rankId" defaultValue="">
                    <option value="">Todos</option>
                    {ranks.map((r) => (
                      <option key={r.id} value={r.id}>
                        Só {r.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
            </FormDialog>
          )
        }
      />

      {goals.length === 0 ? (
        <EmptyState icon={TargetIcon} title="Nenhuma meta definida" description={canManage ? "Crie uma meta semanal (ex.: 200 de metal por membro)." : "A gerência ainda não definiu metas."} />
      ) : (
        <div className="flex flex-col gap-10">
          {me?.hasGoals && (
            <FadeIn>
              <GroupedList
                header="Minha semana"
                footer={me.exempt ? "Você está dispensado da meta desta semana por causa da sua ausência (7 dias ou mais)." : undefined}
              >
                {me.cells.map((c) => {
                  if (!c.applicable) return null;
                  const item = items.find((i) => i.id === c.itemId)!;
                  return (
                    <div key={c.itemId} className="flex flex-col gap-2 px-5 py-4" data-testid="my-goal">
                      <div className="flex items-center justify-between gap-3 text-base">
                        <span className="text-grey-100">{item.name}</span>
                        <span className="tabular-nums text-grey-200">
                          <strong className="text-grey-100">{c.done.toLocaleString("pt-BR")}</strong> / {c.target.toLocaleString("pt-BR")}
                          {c.complete ? <span className="ml-2 text-success">✓ batida</span> : <span className="ml-2 text-muted-foreground">faltam {c.missing.toLocaleString("pt-BR")}</span>}
                        </span>
                      </div>
                      <Bar pct={c.pct} complete={c.complete} />
                    </div>
                  );
                })}
              </GroupedList>
            </FadeIn>
          )}

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <ChartCard
              testId="chart-metas-membros"
              title="Progresso por membro nesta semana"
              description="Média das metas de cada um. A linha marca 100%."
              empty={memberPct.length === 0}
              emptyText="Ninguém tem meta nesta semana."
              table={{ columns: ["Membro", "Progresso"], rows: memberPct.map((m) => [m.name, `${m.pct}%`]) }}
            >
              <RankedBars data={memberPct.map((m) => ({ name: m.name, value: m.pct }))} label="Progresso" format="percent" target={100} />
            </ChartCard>
            <ChartCard
              testId="chart-metas-semanas"
              title="Quem bateu a meta por semana"
              description="Calculado com as metas atuais."
              empty={completion.length === 0}
              table={{ columns: ["Semana", "Bateram", "Membros"], rows: completion.map((w) => [w.label, `${w.pct}%`, `${w.complete} de ${w.total}`]) }}
            >
              <BarTrendChart data={completion} xKey="label" series={[{ key: "pct", label: "Bateram a meta", color: "var(--chart-1)" }]} format="percent" />
            </ChartCard>
          </div>

          {canManage && (
            <GroupedList header="Metas ativas">
              {goals.map((g) => (
                <div key={g.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3" data-testid="goal-row">
                  <span className="text-base text-grey-100">
                    <strong>{g.quantity.toLocaleString("pt-BR")}</strong>× {g.item.name}
                    <span className="text-sm text-muted-foreground"> · {g.rank ? `só ${g.rank.name}` : "todos"}</span>
                  </span>
                  <div className="flex">
                    <FormDialog
                      title={`Meta de ${g.item.name}`}
                      action={updateGoalQuantity.bind(null, g.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar meta de ${g.item.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    >
                      <Field label="Quantidade por semana" htmlFor={`gq-${g.id}`}>
                        <Input id={`gq-${g.id}`} name="quantity" type="number" min={1} defaultValue={g.quantity} />
                      </Field>
                    </FormDialog>
                    <ConfirmButton
                      title={`Remover a meta de ${g.item.name}?`}
                      confirmLabel="Remover"
                      destructive
                      action={deleteGoal.bind(null, g.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Remover meta de ${g.item.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </GroupedList>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="type-h2 text-grey-300">
              Fac · {doneCount} de {withGoals} bateram tudo
            </h2>
            <div className="overflow-x-auto rounded-card glass-card">
              <table className="w-full min-w-[560px] text-left" data-testid="goals-table">
                <thead>
                  <tr className="border-b border-grey-700 text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-bold">Membro</th>
                    {items.map((i) => (
                      <th key={i.id} className="px-5 py-3 font-bold">
                        {i.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => r.hasGoals)
                    .map((r) => (
                      <tr key={r.member.id} className={cn("border-b border-grey-700 last:border-b-0", r.member.id === viewer.member?.id && "bg-cyan-low/40")}>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <PresenceAvatar name={r.member.rpName} src={r.member.user?.avatarUrl} presence={r.absent ? "AUSENTE" : "ATIVO"} size="sm" />
                            <span className="text-base text-grey-100">{r.member.rpName}</span>
                            {r.exempt ? (
                              <StatusBadge label="Dispensado" className="bg-grey-600 text-grey-200" />
                            ) : (
                              r.complete && <StatusBadge label="Bateu" className="bg-success-low text-success" />
                            )}
                            {r.absent && <StatusBadge label="Ausente" className="bg-warning-low text-warning" />}
                          </span>
                        </td>
                        {r.cells.map((c) => (
                          <td key={c.itemId} className="px-5 py-3">
                            {c.applicable ? (
                              <span className="flex min-w-28 flex-col gap-1.5">
                                <span className="text-sm tabular-nums text-grey-200">
                                  {c.done.toLocaleString("pt-BR")} / {c.target.toLocaleString("pt-BR")}
                                </span>
                                <Bar pct={c.pct} complete={c.complete} />
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
