import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { RuleForm } from "../rule-form";
import { createRule } from "../actions";

export const metadata = { title: "Nova regra" };

export default async function NovaRegraPage() {
  await requireViewer("regras.editar");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova página de regras" />
      <RuleForm action={createRule} submitLabel="Publicar" />
    </div>
  );
}
