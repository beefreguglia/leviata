import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { DOSSIER_STATUS, RISK } from "@/lib/labels";
import { fmtAgo } from "@/lib/dates";
import { uploadUrl } from "@/lib/images";
import { GroupedList, GroupedRow } from "@/components/layout/grouped-list";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/status-badge";
import { UploadImage } from "@/components/upload-image";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field, NativeSelect } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/motion";
import { DossierFields } from "../dossier-fields";
import { addDossierLink, addVehicle, deleteDossier, removeDossierLink, removeVehicle, updateDossier } from "../actions";

export default async function DossierPage({ params }: PageProps<"/dossie/[id]">) {
  const viewer = await requireViewer("dossie.ver");
  const canEdit = viewer.can("dossie.editar");
  const { id } = await params;
  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      faction: true,
      author: true,
      vehicles: { orderBy: { plate: "asc" } },
      linksFrom: { include: { to: true } },
      linksTo: { include: { from: true } },
    },
  });
  if (!dossier) notFound();

  const links = [...dossier.linksFrom.map((l) => ({ id: l.id, other: l.to, description: l.description })), ...dossier.linksTo.map((l) => ({ id: l.id, other: l.from, description: l.description }))];
  const linkedIds = links.map((l) => l.other.id);
  const [factions, candidates] = await Promise.all([
    db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.dossier.findMany({ where: { id: { notIn: [id, ...linkedIds] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <FadeIn className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="type-h1 break-words text-grey-100">{dossier.name}</h1>
          {dossier.nickname && <p className="text-base text-muted-foreground">“{dossier.nickname}”</p>}
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge {...DOSSIER_STATUS[dossier.status]} />
            <StatusBadge {...RISK[dossier.threat]} />
          </div>
          <p className="text-sm text-muted-foreground">
            Atualizada {fmtAgo(dossier.updatedAt)}
            {dossier.author && ` · criada por ${dossier.author.rpName}`}
          </p>
        </div>
        {canEdit && (
        <div className="flex gap-2">
          <FormDialog
            title={`Editar ${dossier.name}`}
            size="lg"
            action={updateDossier.bind(null, id)}
            trigger={
              <Button variant="secondary">
                <PencilIcon /> Editar
              </Button>
            }
          >
            <DossierFields dossier={dossier} factions={factions} />
          </FormDialog>
          <ConfirmButton
            title={`Apagar a ficha de ${dossier.name}?`}
            description="Placas e vínculos desta ficha também serão apagados."
            confirmLabel="Apagar"
            destructive
            action={deleteDossier.bind(null, id)}
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Apagar ${dossier.name}`}>
                <Trash2Icon />
              </Button>
            }
          />
        </div>
        )}
      </header>

      <GroupedList header="Dados">
        <GroupedRow label="Telefone">{dossier.phone ?? "—"}</GroupedRow>
        <GroupedRow label="ID">{dossier.passport ?? "—"}</GroupedRow>
        <GroupedRow label="Facção">{dossier.faction ? <Link href={`/faccoes/${dossier.faction.id}`} className="text-cyan-light hover:underline">{dossier.faction.name}</Link> : "—"}</GroupedRow>
      </GroupedList>

      {dossier.notes && (
        <GroupedList header="O que sabemos">
          <div className="px-6 py-6">
            <Markdown>{dossier.notes}</Markdown>
          </div>
        </GroupedList>
      )}

      {dossier.imageIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="type-h2 text-grey-300">Prints</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dossier.imageIds.map((imgId, i) => (
              <a key={imgId} href={uploadUrl(imgId)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-card bg-input" aria-label={`Abrir print ${i + 1}`}>
                <UploadImage id={imgId} alt={`Print ${i + 1} de ${dossier.name}`} className="aspect-video w-full" />
              </a>
            ))}
          </div>
        </section>
      )}

      <GroupedList
        header="Veículos"
        action={
          canEdit && (
          <FormDialog
            title="Adicionar veículo"
            action={addVehicle.bind(null, id)}
            submitLabel="Adicionar"
            trigger={
              <Button size="sm" variant="secondary">
                <PlusIcon /> Veículo
              </Button>
            }
          >
            <Field label="Placa" htmlFor="v-plate">
              <Input id="v-plate" name="plate" required autoComplete="off" spellCheck={false} className="uppercase" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo" htmlFor="v-model">
                <Input id="v-model" name="model" />
              </Field>
              <Field label="Cor" htmlFor="v-color">
                <Input id="v-color" name="color" />
              </Field>
            </div>
          </FormDialog>
          )
        }
      >
        {dossier.vehicles.length === 0 ? (
          <p className="px-5 py-4 text-base text-muted-foreground">Nenhum veículo registrado.</p>
        ) : (
          dossier.vehicles.map((v) => (
            <div key={v.id} data-testid="dossier-vehicle" className="flex min-h-14 items-center justify-between gap-3 px-5 py-2">
              <span className="min-w-0 text-base text-grey-100">
                <strong className="type-code">{v.plate}</strong>
                {(v.model || v.color) && <span className="text-sm text-muted-foreground"> · {[v.model, v.color].filter(Boolean).join(", ")}</span>}
              </span>
              {canEdit && (
              <ConfirmButton
                title={`Remover a placa ${v.plate}?`}
                confirmLabel="Remover"
                destructive
                action={removeVehicle.bind(null, v.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover placa ${v.plate}`}>
                    <XIcon />
                  </Button>
                }
              />
              )}
            </div>
          ))
        )}
      </GroupedList>

      <GroupedList
        header="Vínculos"
        action={
          canEdit && candidates.length > 0 && (
            <FormDialog
              title="Adicionar vínculo"
              action={addDossierLink.bind(null, id)}
              submitLabel="Adicionar"
              trigger={
                <Button size="sm" variant="secondary">
                  <PlusIcon /> Vínculo
                </Button>
              }
            >
              <Field label="Pessoa" htmlFor="l-to">
                <NativeSelect id="l-to" name="toId" required defaultValue="">
                  <option value="">Escolha…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Qual é o vínculo" htmlFor="l-desc">
                <Input id="l-desc" name="description" required placeholder="Ex.: irmão, trabalha para" />
              </Field>
            </FormDialog>
          )
        }
      >
        {links.length === 0 ? (
          <p className="px-5 py-4 text-base text-muted-foreground">Nenhum vínculo registrado.</p>
        ) : (
          links.map((l) => (
            <div key={l.id} data-testid="dossier-link" className="flex min-h-14 items-center justify-between gap-3 px-5 py-2">
              <span className="min-w-0 text-base">
                <Link href={`/dossie/${l.other.id}`} className="text-cyan-light hover:underline">
                  {l.other.name}
                </Link>
                <span className="text-sm text-muted-foreground"> · {l.description}</span>
              </span>
              {canEdit && (
              <ConfirmButton
                title={`Remover o vínculo com ${l.other.name}?`}
                confirmLabel="Remover"
                destructive
                action={removeDossierLink.bind(null, l.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover vínculo com ${l.other.name}`}>
                    <XIcon />
                  </Button>
                }
              />
              )}
            </div>
          ))
        )}
      </GroupedList>
    </FadeIn>
  );
}
