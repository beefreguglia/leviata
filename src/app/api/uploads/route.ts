import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { saveImageUpload } from "@/lib/uploads";
import { uploadUrl } from "@/lib/images";

/** Envia uma imagem (multipart, campo "file"). Só membros com acesso ao painel. */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!viewer.can("painel.ver")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo no campo 'file'" }, { status: 400 });

  try {
    const upload = await saveImageUpload(file, viewer.member?.id ?? null);
    return NextResponse.json({ id: upload.id, url: uploadUrl(upload.id), name: upload.name }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha no upload" }, { status: 400 });
  }
}
