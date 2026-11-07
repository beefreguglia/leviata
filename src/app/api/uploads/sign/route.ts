import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { startSignedUpload } from "@/lib/uploads";

/** Pede um link para enviar a imagem direto ao storage (produção). Em dev responde { mode: "direct" }. */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!viewer.can("painel.ver")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = z.object({ type: z.string(), size: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  try {
    return NextResponse.json(await startSignedUpload(body.data.type, body.data.size));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no upload" }, { status: 400 });
  }
}
