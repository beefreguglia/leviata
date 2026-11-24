import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { isGone } from "@/lib/members";
import { consumeQuota, fakeCompletion, HISTORY_LIMIT, QuotaError, runAssistant } from "@/lib/ai/assistant";
import { AiUnavailableError, aiConfigured, createCompletion, isFakeAi } from "@/lib/ai/providers";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .transform((m) => m.slice(-HISTORY_LIMIT)),
  page: z.string().max(200).nullable().optional(),
});

/** Chat do assistente: recebe a conversa e devolve a resposta + cartões de ação para confirmar. */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!viewer.member || isGone(viewer.member.status) || !viewer.can("assistente.ver")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (!aiConfigured()) return NextResponse.json({ error: "O assistente ainda não foi configurado (falta a chave da IA)." }, { status: 503 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.messages.at(-1)?.role !== "user") return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  try {
    await consumeQuota(viewer.user.id);
    const complete = isFakeAi() ? fakeCompletion : createCompletion();
    return NextResponse.json(await runAssistant(viewer, body.data.messages, complete, body.data.page ?? null));
  } catch (err) {
    if (err instanceof QuotaError) return NextResponse.json({ error: err.message }, { status: 429 });
    if (err instanceof AiUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("Falha no assistente:", err);
    return NextResponse.json({ error: "O assistente falhou. Tente de novo." }, { status: 500 });
  }
}
