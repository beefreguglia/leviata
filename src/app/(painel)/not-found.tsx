import { SearchXIcon } from "lucide-react";
import { StatusScreen } from "@/components/layout/status-screen";
import { LinkButton } from "@/components/ui/link-button";

/** notFound() dentro do painel: mantém o menu e mostra a mensagem no card. */
export default function PainelNotFound() {
  return (
    <StatusScreen
      icon={SearchXIcon}
      code="404"
      title="Não encontramos isso"
      description="O que você procura foi apagado ou o link está errado."
      actions={
        <>
          <LinkButton href="/dashboard">Voltar ao início</LinkButton>
        </>
      }
    />
  );
}
