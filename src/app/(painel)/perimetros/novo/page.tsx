import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { PerimeterForm } from "../perimeter-form";
import { createPerimeter } from "../actions";

export const metadata = { title: "Novo perímetro" };

export default async function NovoPerimetroPage() {
  await requireViewer("operacoes.gerenciar");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo perímetro" description="Um título e a foto do alvo vista de cima." />
      <PerimeterForm action={createPerimeter} submitLabel="Criar perímetro" />
    </div>
  );
}
