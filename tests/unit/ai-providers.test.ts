import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiUnavailableError, aiEndpoints, cooldownMs, createCompletion, resetAiCooldowns, type Endpoint } from "@/lib/ai/providers";

const ep = (id: string): Endpoint => ({ id, label: id, baseUrl: `https://${id}.test/v1`, apiKey: "k", model: id });
const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const fail = (status: number, body = "{}", headers: Record<string, string> = {}) => new Response(body, { status, headers });

describe("fila de provedores de IA", () => {
  beforeEach(() => resetAiCooldowns());

  it("monta a fila só com quem tem chave, na ordem Groq → Gemini → OpenRouter", () => {
    expect(aiEndpoints({})).toEqual([]);
    const ids = aiEndpoints({ GROQ_API_KEY: "g", OPENROUTER_API_KEY: "o", GEMINI_API_KEY: "x" }).map((e) => e.id);
    expect(ids).toEqual(["groq:openai/gpt-oss-120b", "groq:openai/gpt-oss-20b", "gemini:gemini-2.5-flash", "openrouter:openrouter/free"]);
    expect(aiEndpoints({ GROQ_API_KEY: "g", AI_GROQ_MODELS: "a, b" }).map((e) => e.model)).toEqual(["a", "b"]);
  });

  it("quando um bate o limite, passa para o próximo e deixa o primeiro de molho", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => (String(url).includes("a.test") ? fail(429, "rate limit", { "retry-after": "30" }) : ok("oi")));
    let t = 1_000_000;
    const complete = createCompletion({ endpoints: [ep("a"), ep("b")], fetchImpl: fetchImpl as typeof fetch, now: () => t });
    expect((await complete([{ role: "user", content: "x" }], [])).endpoint.id).toBe("b");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // ainda de molho: nem tenta o "a"
    fetchImpl.mockClear();
    await complete([{ role: "user", content: "x" }], []);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // passou o tempo: volta a tentar o "a" primeiro
    t += 31_000;
    fetchImpl.mockClear();
    await complete([{ role: "user", content: "x" }], []);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("a.test");
  });

  it("queda de rede e erro 500 também pulam; todos falhando dá erro amigável", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("a.test")) throw new TypeError("fetch failed");
      return fail(500);
    });
    const complete = createCompletion({ endpoints: [ep("a"), ep("b")], fetchImpl: fetchImpl as typeof fetch });
    await expect(complete([{ role: "user", content: "x" }], [])).rejects.toBeInstanceOf(AiUnavailableError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("castigo por tipo de falha", () => {
    expect(cooldownMs(429, "20", "")).toBe(20_000);
    expect(cooldownMs(429, null, "Rate limit reached ... tokens per day (TPD)")).toBe(3_600_000);
    expect(cooldownMs(401, null, "")).toBe(600_000);
    expect(cooldownMs(400, null, "tool_use_failed")).toBe(0);
  });
});
