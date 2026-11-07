"use client";

import { useEffect } from "react";

/** Último recurso (erro no layout raiz): sem CSS do app, então estilo inline no tema escuro. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100svh", display: "grid", placeItems: "center", background: "#121214", color: "#e1e1e6", fontFamily: "system-ui, sans-serif" }}>
        <title>Erro · Leviata</title>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Algo deu errado</h1>
          <p style={{ color: "#8d8d99", margin: "0 0 24px" }}>O painel teve um problema inesperado. Tente de novo em alguns segundos.</p>
          <button
            onClick={() => retry()}
            style={{ background: "#00d9ff", color: "#07303a", border: 0, borderRadius: 12, padding: "14px 24px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
