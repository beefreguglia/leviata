import { CompassIcon } from "@/components/icons";
import { StatusScreen } from "@/components/layout/status-screen";
import { LinkButton } from "@/components/ui/link-button";

export const metadata = { title: "Página não encontrada" };

/** 404 de qualquer endereço que não existe. */
export default function NotFound() {
  return (
    <StatusScreen
      fullscreen
      icon={CompassIcon}
      code="404"
      title="Página não encontrada"
      description="Esse endereço não existe ou foi removido. Confira o link ou volte para o início."
      actions={<LinkButton href="/dashboard">Voltar ao início</LinkButton>}
    />
  );
}
