import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field } from "@/components/forms/fields";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/motion";
import { saveMyRegistration } from "./actions";

export const metadata = { title: "Meu registro" };

export default async function RegistroPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const member = viewer.member;
  if (!member) redirect("/sem-acesso");
  const pending = !member.passport || !member.phone;

  return (
    <FadeIn className="mx-auto max-w-xl">
      <PageHeader
        title="Meu registro"
        description={
          pending
            ? "Antes de tudo, se registre: é assim que a liderança te encontra na cidade."
            : "Seus dados na cidade. Mudou de número? Atualize aqui."
        }
      />
      <ActionForm action={saveMyRegistration} className="flex flex-col gap-4 rounded-card bg-card p-6">
        <Field label="Nome" htmlFor="rpName">
          <Input id="rpName" name="rpName" required defaultValue={member.rpName} placeholder="Seu nome na cidade" autoComplete="off" />
        </Field>
        <Field label="Número" htmlFor="phone" hint="O número do celular no jogo.">
          <Input id="phone" name="phone" required defaultValue={member.phone ?? ""} placeholder="(055) 000-000" inputMode="tel" autoComplete="off" />
        </Field>
        <Field label="ID" htmlFor="passport" hint="Seu ID (passaporte) na cidade.">
          <Input id="passport" name="passport" required defaultValue={member.passport ?? ""} placeholder="0000" inputMode="numeric" autoComplete="off" />
        </Field>
        <div className="flex justify-end pt-2">
          <SubmitButton size="lg">{pending ? "Registrar" : "Salvar"}</SubmitButton>
        </div>
      </ActionForm>
    </FadeIn>
  );
}
