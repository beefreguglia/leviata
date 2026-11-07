import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { getStorage } from "@/lib/storage";

/** Serve uma imagem para quem está logado (inclusive recrutas). */
export async function GET(_request: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("Não autenticado", { status: 401 });

  const { id } = await ctx.params;
  const upload = await db.upload.findUnique({ where: { id } });
  if (!upload) return new NextResponse("Não encontrado", { status: 404 });

  const data = await getStorage().get(upload.key);
  if (!data) return new NextResponse("Arquivo sumiu do storage", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": upload.mime,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${encodeURIComponent(upload.name)}"`,
    },
  });
}
