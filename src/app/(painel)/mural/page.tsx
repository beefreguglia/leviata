import Link from "next/link";
import { CalendarIcon, ImageIcon, MegaphoneIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { fmtDate } from "@/lib/dates";
import { uploadUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Field } from "@/components/forms/fields";
import { ImageInput } from "@/components/forms/image-input";
import { UploadImage } from "@/components/upload-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stagger, StaggerItem } from "@/components/motion";
import { NoticeCard } from "./notice-card";
import { noticeInclude } from "@/lib/polls";
import { NoticeFields } from "./notice-fields";
import { createFlyer, createNotice, deleteFlyer } from "./actions";

export const metadata = { title: "Mural & Flyers" };

const TABS = [
  { key: "avisos", label: "Avisos", icon: MegaphoneIcon },
  { key: "flyers", label: "Flyers", icon: ImageIcon },
] as const;

export default async function MuralPage({ searchParams }: PageProps<"/mural">) {
  const viewer = await requireViewer();
  const canEdit = viewer.can("conteudo.editar");
  const sp = await searchParams;
  const tab = sp.aba === "flyers" ? "flyers" : "avisos";
  const now = new Date();

  const [notices, expired, flyers] = await Promise.all([
    db.notice.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      include: noticeInclude(viewer.member?.id),
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    canEdit
      ? db.notice.findMany({ where: { expiresAt: { lt: now } }, include: noticeInclude(viewer.member?.id), orderBy: { expiresAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    db.flyer.findMany({ include: { author: true }, orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <>
      <PageHeader
        title="Mural & Flyers"
        description="Avisos da liderança e os flyers da Leviata."
        actions={
          canEdit && (
            <>
              <FormDialog
                title="Novo flyer"
                action={createFlyer}
                submitLabel="Publicar"
                trigger={
                  <Button variant="secondary">
                    <ImageIcon /> Novo flyer
                  </Button>
                }
              >
                <ImageInput name="imageId" label="Imagem do flyer" />
                <Field label="Título" htmlFor="flyer-title">
                  <Input id="flyer-title" name="title" required placeholder="Ex.: Corrida de sábado" />
                </Field>
                <Field label="Data do evento (opcional)" htmlFor="flyer-date">
                  <Input id="flyer-date" name="eventDate" type="date" />
                </Field>
                <Field label="Descrição (opcional)" htmlFor="flyer-desc">
                  <Textarea id="flyer-desc" name="description" rows={3} />
                </Field>
              </FormDialog>
              <FormDialog
                title="Novo aviso"
                size="lg"
                action={createNotice}
                submitLabel="Publicar"
                trigger={
                  <Button>
                    <PlusIcon /> Novo aviso
                  </Button>
                }
              >
                <NoticeFields />
              </FormDialog>
            </>
          )
        }
      />

      <nav className="mb-8 flex gap-1 rounded-md bg-card p-1 sm:w-fit" aria-label="Seções do mural">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "avisos" ? "/mural" : "/mural?aba=flyers"}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition-colors sm:flex-none",
              tab === t.key ? "bg-grey-700 text-grey-100" : "text-muted-foreground hover:text-grey-100",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              {t.key === "avisos" ? notices.length : flyers.length}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "avisos" ? (
        notices.length === 0 ? (
          <EmptyState icon={MegaphoneIcon} title="Nenhum aviso no mural" description="Quando a liderança publicar algo, aparece aqui." />
        ) : (
          <Stagger className="flex flex-col gap-4">
            {notices.map((n) => (
              <StaggerItem key={n.id}>
                <NoticeCard notice={n} canEdit={canEdit} />
              </StaggerItem>
            ))}
            {expired.length > 0 && (
              <StaggerItem className="mt-6 flex flex-col gap-4">
                <h2 className="text-sm font-bold text-grey-200">Expirados (só a gerência vê)</h2>
                {expired.map((n) => (
                  <NoticeCard key={n.id} notice={n} canEdit={canEdit} />
                ))}
              </StaggerItem>
            )}
          </Stagger>
        )
      ) : flyers.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Nenhum flyer ainda" description="Flyers de eventos, corridas e recrutamento aparecem aqui." />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {flyers.map((f) => (
            <StaggerItem key={f.id}>
              <article data-testid="flyer" className="group flex h-full flex-col overflow-hidden rounded-card bg-card">
                <a href={uploadUrl(f.imageId)} target="_blank" rel="noreferrer" className="block overflow-hidden bg-input" aria-label={`Abrir flyer ${f.title}`}>
                  <UploadImage id={f.imageId} alt={f.title} className="aspect-[4/5] w-full transition-transform duration-300 group-hover:scale-[1.02]" />
                </a>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-grey-100">{f.title}</h3>
                    {canEdit && (
                      <ConfirmButton
                        title={`Apagar o flyer "${f.title}"?`}
                        confirmLabel="Apagar"
                        destructive
                        action={deleteFlyer.bind(null, f.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2" aria-label={`Apagar flyer ${f.title}`}>
                            <Trash2Icon />
                          </Button>
                        }
                      />
                    )}
                  </div>
                  {f.eventDate && (
                    <p className="flex items-center gap-1.5 text-sm text-cyan-light">
                      <CalendarIcon className="size-4" /> {fmtDate(f.eventDate)}
                    </p>
                  )}
                  {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
