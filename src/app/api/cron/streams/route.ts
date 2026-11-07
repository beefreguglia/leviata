import { NextResponse } from "next/server";
import { refreshStreams } from "@/lib/stream-refresh";

/**
 * Atualiza o status das lives. Chame com `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron envia assim; ou um serviço como cron-job.org a cada 2–5 min).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const summary = await refreshStreams();
  return NextResponse.json(summary);
}
