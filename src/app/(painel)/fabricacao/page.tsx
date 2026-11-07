import { HammerIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { fmtMinutes } from "@/lib/crafting";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, GroupedList } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field } from "@/components/forms/fields";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/motion";
import { CraftCalculator } from "./calculator";
import { QuickCalculator } from "./quick-calculator";
import { RecipeFields } from "./recipe-fields";
import { createItem, createRecipe, deleteItem, deleteRecipe, updateItem, updateRecipe } from "./actions";
import type { Item } from "@/generated/prisma/client";

export const metadata = { title: "Fabricação" };

function ItemFields({ item }: { item?: Item }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
        <Field label="Nome" htmlFor="i-name">
          <Input id="i-name" name="name" required defaultValue={item?.name} placeholder="Ex.: Pólvora" />
        </Field>
        <Field label="Unidade" htmlFor="i-unit">
          <Input id="i-unit" name="unit" defaultValue={item?.unit ?? "un"} />
        </Field>
      </div>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md bg-input px-4 text-base">
        Item ilegal
        <input type="checkbox" name="isIllegal" defaultChecked={item?.isIllegal} className="size-5 accent-[var(--primary)]" />
      </label>
    </>
  );
}

export default async function FabricacaoPage() {
  const viewer = await requireViewer("economia.ver");
  const canEdit = viewer.can("conteudo.editar");
  const [items, recipes] = await Promise.all([
    db.item.findMany({ orderBy: { name: "asc" }, include: { farmGuides: { select: { id: true }, take: 1 }, _count: { select: { usedIn: true } } } }),
    db.recipe.findMany({ include: { outputItem: true, inputs: { include: { item: true } } }, orderBy: { outputItem: { name: "asc" } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Fabricação"
        description="Calculadoras de materiais e as receitas da fac."
        actions={
          canEdit && (
            <>
              <FormDialog
                title="Novo item"
                description="Matéria-prima ou produto. Itens são usados nas receitas e nos guias de farm."
                action={createItem}
                submitLabel="Cadastrar"
                trigger={
                  <Button variant="secondary">
                    <PackageIcon /> Novo item
                  </Button>
                }
              >
                <ItemFields />
              </FormDialog>
              <FormDialog
                title="Nova receita"
                size="lg"
                action={createRecipe}
                submitLabel="Salvar receita"
                trigger={
                  <Button disabled={items.length < 2}>
                    <PlusIcon /> Nova receita
                  </Button>
                }
              >
                <RecipeFields items={items} />
              </FormDialog>
            </>
          )
        }
      />

      <div className="flex flex-col gap-10">
        <FadeIn className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold text-grey-200">Calculadora rápida</h2>
            <p className="text-sm text-muted-foreground">Digite os materiais de uma fabricação e quanto quer fazer — não precisa cadastrar nada.</p>
          </div>
          <QuickCalculator
            presets={recipes.map((r) => ({
              id: r.id,
              name: r.outputItem.name,
              outputQty: r.outputQty,
              inputs: r.inputs.map((i) => ({ name: i.item.name, quantity: i.quantity })),
            }))}
          />
        </FadeIn>

        <FadeIn className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold text-grey-200">Calculadora de receitas</h2>
            <p className="text-sm text-muted-foreground">Usa as receitas cadastradas e abre a árvore até a matéria-prima.</p>
          </div>
          <CraftCalculator
            items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, farmGuideId: i.farmGuides[0]?.id ?? null }))}
            recipes={recipes.map((r) => ({
              id: r.id,
              outputItemId: r.outputItemId,
              outputQty: r.outputQty,
              minutes: r.minutes,
              inputs: r.inputs.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
            }))}
          />
        </FadeIn>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-grey-200">Receitas · {recipes.length}</h2>
          {recipes.length === 0 ? (
            <EmptyState
              icon={HammerIcon}
              title="Nenhuma receita"
              description={items.length < 2 ? "Cadastre os itens primeiro (o produto e os insumos)." : "Cadastre a primeira receita."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
              {recipes.map((r) => (
                <article key={r.id} data-testid="recipe" className="flex flex-col gap-4 rounded-card bg-card p-5">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-grey-100">
                        {r.outputQty > 1 && <span className="text-primary">{r.outputQty}× </span>}
                        {r.outputItem.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {[r.minutes != null && fmtMinutes(r.minutes), r.location].filter(Boolean).join(" · ") || "Sem tempo/local"}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex">
                        <FormDialog
                          title={`Receita de ${r.outputItem.name}`}
                          size="lg"
                          action={updateRecipe.bind(null, r.id)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Editar receita de ${r.outputItem.name}`}>
                              <PencilIcon />
                            </Button>
                          }
                        >
                          <RecipeFields items={items} recipe={r} />
                        </FormDialog>
                        <ConfirmButton
                          title={`Apagar a receita de ${r.outputItem.name}?`}
                          confirmLabel="Apagar"
                          destructive
                          action={deleteRecipe.bind(null, r.id)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Apagar receita de ${r.outputItem.name}`}>
                              <Trash2Icon />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </header>
                  <ul className="flex flex-wrap gap-1.5">
                    {r.inputs.map((i) => (
                      <li key={i.id} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-grey-700 px-3 text-sm text-grey-100">
                        <span className="font-bold tabular-nums text-cyan-light">{i.quantity}</span> {i.item.name}
                      </li>
                    ))}
                  </ul>
                  {r.notes && <p className="text-sm text-grey-300">{r.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <GroupedList header={`Itens · ${items.length}`} footer="Itens com guia de farm mostram o atalho na calculadora.">
          {items.length === 0 ? (
            <p className="px-5 py-4 text-base text-muted-foreground">Nenhum item cadastrado.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base text-grey-100">{it.name}</span>
                  <span className="text-xs text-muted-foreground">({it.unit})</span>
                  {it.isIllegal && <StatusBadge label="Ilegal" className="bg-danger-low text-danger-light" />}
                  {it.farmGuides.length > 0 && <StatusBadge label="Tem guia de farm" className="bg-success-low text-success" />}
                </div>
                {canEdit && (
                  <div className="flex">
                    <FormDialog
                      title={`Editar ${it.name}`}
                      action={updateItem.bind(null, it.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar item ${it.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    >
                      <ItemFields item={it} />
                    </FormDialog>
                    <ConfirmButton
                      title={`Apagar o item ${it.name}?`}
                      confirmLabel="Apagar"
                      destructive
                      action={deleteItem.bind(null, it.id)}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Apagar item ${it.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </GroupedList>
      </div>
    </>
  );
}
