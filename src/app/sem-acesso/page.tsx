import { LockKeyholeIcon } from "@/components/icons";
import { signOut } from "@/auth";
import { getViewer } from "@/lib/session";
import { isGone } from "@/lib/members";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

export const metadata = { title: "Acesso restrito" };

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

/** 403: logado, mas sem permissão para a área (ou sem ficha/expulso). */
export default async function SemAcessoPage() {
  const viewer = await getViewer();
  const status = viewer?.member?.status;
  const inPanel = Boolean(viewer?.member && !isGone(status));

  const description =
    status === "EXPULSO"
      ? "Você foi expulso da Leviatã e não tem mais acesso ao painel. Se acha que é um engano, fale com a liderança."
      : status === "SAIU"
        ? "Você saiu da Leviatã e não tem mais acesso ao painel. Se for voltar, fale com a liderança."
        : inPanel
          ? "Essa área é só para quem tem a patente certa. Se precisa dela, fale com a liderança."
          : "Sua conta ainda não tem ficha na Leviatã. Fale com a liderança para liberar seu acesso.";

  return (
    <StatusScreen
      fullscreen
      icon={LockKeyholeIcon}
      tone="warning"
      code="403"
      title="Acesso restrito"
      description={description}
      actions={
        <>
          {inPanel && <LinkButton href="/dashboard">Voltar ao início</LinkButton>}
          <form action={signOutAction}>
            <Button type="submit" variant={inPanel ? "ghost" : "secondary"}>
              Sair
            </Button>
          </form>
        </>
      }
    />
  );
}
