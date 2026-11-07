import { notFound } from "next/navigation";
import { Trash2Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { Button } from "@/components/ui/button";
import { RuleForm } from "../../rule-form";
import { deleteRule, updateRule } from "../../actions";

export const metadata = { title: "Editar regra" };

export default async function EditarRegraPage({ params }: PageProps<"/regras/[slug]/editar">) {
  await requireViewer("regras.editar");
  const { slug } = await params;
  const page = await db.rulePage.findUnique({ where: { slug } });
  if (!page) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Editar regra"
        description="Cada vez que salvar, uma versão fica guardada no histórico."
        actions={
          <ConfirmButton
            title={`Apagar "${page.title}"?`}
            description="A página e o histórico serão apagados. O conteúdo fica salvo no log de auditoria."
            confirmLabel="Apagar"
            destructive
            action={deleteRule.bind(null, page.id)}
            trigger={
              <Button variant="destructive">
                <Trash2Icon /> Apagar
              </Button>
            }
          />
        }
      />
      <RuleForm action={updateRule.bind(null, page.id)} page={page} submitLabel="Salvar alterações" />
    </div>
  );
}
