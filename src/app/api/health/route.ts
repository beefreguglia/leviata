import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { configStatus, productionProblems } from "@/lib/config-status";

/** Saúde do painel: banco respondendo + o que está configurado (sem valores secretos). */
export async function GET() {
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }
  const problems = process.env.NODE_ENV === "production" ? productionProblems() : [];
  const ok = database && problems.length === 0;
  return NextResponse.json({ ok, database, config: configStatus(), problems }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
