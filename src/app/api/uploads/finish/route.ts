import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { finishSignedUpload } from "@/lib/uploads";
import { uploadUrl } from "@/lib/images";

/** Confirma um upload feito direto ao storage: valida o arquivo e registra. */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!viewer.can("painel.ver")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = z.object({ key: z.string(), name: z.string() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  try {
    const up = await finishSignedUpload(body.data.key, body.data.name, viewer.member?.id ?? null);
    return NextResponse.json({ id: up.id, url: uploadUrl(up.id), name: up.name }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no upload" }, { status: 400 });
  }
}
