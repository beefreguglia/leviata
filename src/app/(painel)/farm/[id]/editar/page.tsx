import { notFound } from "next/navigation";
import { Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Button } from "@/components/ui/button";
import { FarmForm } from "../../farm-form";
import { deleteFarmGuide, updateFarmGuide } from "../../actions";

export const metadata = { title: "Editar guia de farm" };

export default async function EditarFarmPage({ params }: PageProps<"/farm/[id]/editar">) {
  await requireViewer("farm.editar");
  const { id } = await params;
  const [guide, items] = await Promise.all([
    db.farmGuide.findUnique({ where: { id } }),
    db.item.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!guide) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Editar guia de farm"
        actions={
          <ConfirmButton
            title={`Apagar "${guide.title}"?`}
            confirmLabel="Apagar"
            destructive
            action={deleteFarmGuide.bind(null, guide.id)}
            trigger={
              <Button variant="destructive">
                <Trash2Icon /> Apagar
              </Button>
            }
          />
        }
      />
      <FarmForm action={updateFarmGuide.bind(null, guide.id)} guide={guide} items={items} submitLabel="Salvar alterações" />
    </div>
  );
}
