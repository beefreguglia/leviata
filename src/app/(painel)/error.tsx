"use client";

import { useEffect } from "react";
import { RotateCcwIcon, TriangleAlertIcon } from "@/components/icons";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

/** Erro inesperado numa página do painel: o menu continua de pé e dá para tentar de novo. */
export default function PainelError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <StatusScreen
      icon={TriangleAlertIcon}
      tone="danger"
      title="Algo deu errado"
      description={
        <>
          Não foi possível carregar esta página. Tente de novo; se continuar, avise a liderança
          {digest ? (
            <>
              {" "}
              com o código <code className="font-mono text-grey-200">{digest}</code>
            </>
          ) : null}
          .
        </>
      }
      actions={
        <>
          <Button onClick={() => retry()}>
            <RotateCcwIcon /> Tentar de novo
          </Button>
          <LinkButton href="/dashboard" variant="secondary">
            Voltar ao início
          </LinkButton>
        </>
      }
    />
  );
}
