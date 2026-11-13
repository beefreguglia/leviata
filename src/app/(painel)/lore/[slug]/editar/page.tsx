import { notFound } from "next/navigation";
import { Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Button } from "@/components/ui/button";
import { LoreForm } from "../../lore-form";
import { deleteLore, updateLore } from "../../actions";

export const metadata = { title: "Editar lore" };

export default async function EditarLorePage({ params }: PageProps<"/lore/[slug]/editar">) {
  await requireViewer("lore.editar");
  const { slug } = await params;
  const article = await db.loreArticle.findUnique({ where: { slug } });
  if (!article) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Editar lore"
        actions={
          <ConfirmButton
            title={`Apagar "${article.title}"?`}
            description="O texto fica guardado no log de auditoria."
            confirmLabel="Apagar"
            destructive
            action={deleteLore.bind(null, article.id)}
            trigger={
              <Button variant="destructive">
                <Trash2Icon /> Apagar
              </Button>
            }
          />
        }
      />
      <LoreForm action={updateLore.bind(null, article.id)} article={article} submitLabel="Salvar alterações" />
    </div>
  );
}
