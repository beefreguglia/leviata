import { notFound } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Button } from "@/components/ui/button";
import { PerimeterForm } from "../../perimeter-form";
import { deletePerimeter, updatePerimeter } from "../../actions";

export const metadata = { title: "Editar perímetro" };

export default async function EditarPerimetroPage({ params }: PageProps<"/perimetros/[id]/editar">) {
  await requireViewer("operacoes.gerenciar");
  const { id } = await params;
  const perimeter = await db.perimeter.findUnique({ where: { id } });
  if (!perimeter) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Editar perímetro"
        actions={
          <ConfirmButton
            title={`Apagar "${perimeter.name}"?`}
            description="Eventos que usam este perímetro continuam existindo (sem o vínculo)."
            confirmLabel="Apagar"
            destructive
            action={deletePerimeter.bind(null, perimeter.id)}
            trigger={
              <Button variant="destructive">
                <Trash2Icon /> Apagar
              </Button>
            }
          />
        }
      />
      <PerimeterForm action={updatePerimeter.bind(null, perimeter.id)} perimeter={perimeter} submitLabel="Salvar alterações" />
    </div>
  );
}
