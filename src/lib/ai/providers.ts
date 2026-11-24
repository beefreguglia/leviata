import "server-only";

/**
 * Provedores de IA grátis, todos no formato de chat da OpenAI (`/chat/completions` com ferramentas).
 * A fila segue a ordem abaixo; quando um modelo bate o limite (429) ou cai, o próximo assume
 * e o que falhou fica de molho por um tempo. Só entra na fila quem tem chave configurada.
 */

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type Endpoint = {
  /** "groq:openai/gpt-oss-120b" */
  id: string;
  /** nome amigável para o rodapé do chat */
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** campos extras do corpo (ex.: esforço de raciocínio no Groq) */
  extra?: Record<string, unknown>;
};

const list = (v: string | undefined, fallback: string) =>
  (v?.trim() ? v : fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Fila de modelos, na ordem de preferência. */
export function aiEndpoints(env: Record<string, string | undefined> = process.env): Endpoint[] {
  const out: Endpoint[] = [];
  if (env.GROQ_API_KEY?.trim()) {
    for (const model of list(env.AI_GROQ_MODELS, "openai/gpt-oss-120b,openai/gpt-oss-20b")) {
      out.push({
        id: `groq:${model}`,
        label: `Groq · ${model.split("/").pop()}`,
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: env.GROQ_API_KEY.trim(),
        model,
        extra: model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined,
      });
    }
  }
  if (env.GEMINI_API_KEY?.trim()) {
    for (const model of list(env.AI_GEMINI_MODELS, "gemini-2.5-flash")) {
      out.push({
        id: `gemini:${model}`,
        label: `Gemini · ${model}`,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: env.GEMINI_API_KEY.trim(),
        model,
      });
    }
  }
  if (env.OPENROUTER_API_KEY?.trim()) {
    for (const model of list(env.AI_OPENROUTER_MODELS, "openrouter/free")) {
      out.push({
        id: `openrouter:${model}`,
        label: `OpenRouter · ${model.split("/").pop()}`,
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: env.OPENROUTER_API_KEY.trim(),
        model,
      });
    }
  }
  return out;
}

export function aiConfigured(env: Record<string, string | undefined> = process.env) {
  return aiEndpoints(env).length > 0 || isFakeAi(env);
}

/** Modelo de mentira para os testes (nunca em produção). */
export function isFakeAi(env: Record<string, string | undefined> = process.env) {
  return env.AI_FAKE === "true" && env.NODE_ENV !== "production";
}

/** Até quando cada modelo fica fora da fila (memória do servidor; zera a cada deploy, e tudo bem). */
const cooldownUntil = new Map<string, number>();

export function resetAiCooldowns() {
  cooldownUntil.clear();
}

/** Quanto tempo deixar um modelo de molho, pelo tipo de falha. */
export function cooldownMs(status: number, retryAfter: string | null, body: string) {
  const fromHeader = retryAfter ? Number(retryAfter) * 1000 : NaN;
  if (status === 429) {
    if (/per day|daily|\bRPD\b|\bTPD\b|quota/i.test(body)) return 60 * 60_000; // cota do dia: 1 h
    return Number.isFinite(fromHeader) && fromHeader > 0 ? Math.min(fromHeader, 15 * 60_000) : 60_000;
  }
  if (status === 401 || status === 403 || status === 402) return 10 * 60_000; // chave errada ou sem crédito
  if (status >= 500 || status === 0) return 30_000; // fora do ar / tempo esgotado
  return 0; // 400: pedido que esse modelo não entendeu — tenta o próximo, sem castigo
}

export class AiUnavailableError extends Error {
  constructor(public readonly attempts: string[]) {
    super("Os modelos de IA grátis estão sem cota agora. Tente de novo em alguns minutos.");
  }
}

export type Completion = { message: Extract<ChatMessage, { role: "assistant" }>; endpoint: Pick<Endpoint, "id" | "label"> };
export type CompleteFn = (messages: ChatMessage[], tools: ToolSpec[]) => Promise<Completion>;

/** Chama a fila: o primeiro modelo disponível que responder ganha. */
export function createCompletion({
  endpoints = aiEndpoints(),
  fetchImpl = fetch,
  now = () => Date.now(),
  timeoutMs = 25_000,
}: { endpoints?: Endpoint[]; fetchImpl?: typeof fetch; now?: () => number; timeoutMs?: number } = {}): CompleteFn {
  return async (messages, tools) => {
    const attempts: string[] = [];
    const ready = endpoints.filter((e) => (cooldownUntil.get(e.id) ?? 0) <= now());
    // se todos estão de molho, tenta mesmo assim o que volta primeiro (melhor que recusar na hora)
    const queue = ready.length > 0 ? ready : [...endpoints].sort((a, b) => (cooldownUntil.get(a.id) ?? 0) - (cooldownUntil.get(b.id) ?? 0)).slice(0, 1);
    for (const e of queue) {
      let status = 0;
      let body = "";
      let retryAfter: string | null = null;
      try {
        const res = await fetchImpl(`${e.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${e.apiKey}` },
          body: JSON.stringify({
            model: e.model,
            messages,
            ...(tools.length ? { tools, tool_choice: "auto" } : {}),
            temperature: 0.3,
            max_tokens: 1200,
            ...e.extra,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        status = res.status;
        retryAfter = res.headers.get("retry-after");
        body = await res.text();
        if (res.ok) {
          const data = JSON.parse(body) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
          const m = data.choices?.[0]?.message;
          if (m && (m.content || m.tool_calls?.length)) {
            cooldownUntil.delete(e.id);
            return {
              message: { role: "assistant", content: m.content ?? null, ...(m.tool_calls?.length ? { tool_calls: m.tool_calls } : {}) },
              endpoint: { id: e.id, label: e.label },
            };
          }
          status = 502; // resposta vazia: trata como falha do modelo
        }
      } catch {
        status = 0; // rede ou tempo esgotado
      }
      attempts.push(`${e.id} → ${status || "sem resposta"}`);
      const wait = cooldownMs(status, retryAfter, body);
      if (wait > 0) cooldownUntil.set(e.id, now() + wait);
    }
    console.warn("Assistente sem modelo disponível:", attempts.join("; "));
    throw new AiUnavailableError(attempts);
  };
}
