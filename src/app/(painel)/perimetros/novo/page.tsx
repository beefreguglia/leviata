import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { PerimeterForm } from "../perimeter-form";
import { createPerimeter } from "../actions";

export const metadata = { title: "Novo perímetro" };

export default async function NovoPerimetroPage() {
  await requireViewer("operacoes.gerenciar");
  const pins = await db.mapPin.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo perímetro" description="Defina as funções, o plano e as rotas. Depois é só agendar a ação." />
      <PerimeterForm action={createPerimeter} pins={pins} submitLabel="Criar perímetro" />
    </div>
  );
}
