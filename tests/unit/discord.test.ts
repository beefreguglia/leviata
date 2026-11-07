import { afterEach, describe, expect, it, vi } from "vitest";
import { discordAvatarUrl, getGuildMember, sendWebhook } from "@/lib/discord";

const mockFetch = (impl: (...args: unknown[]) => Promise<Response>) => vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);

afterEach(() => vi.restoreAllMocks());

describe("getGuildMember", () => {
  it("chama a API do Discord com o token e devolve o membro", async () => {
    const spy = mockFetch(async () => Response.json({ roles: ["1"], nick: "Dante" }));
    await expect(getGuildMember("tok", "123")).resolves.toEqual({ roles: ["1"], nick: "Dante" });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/v10/users/@me/guilds/123/member");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it.each([404, 403])("devolve null quando não está no servidor (%i)", async (status) => {
    mockFetch(async () => new Response("", { status }));
    await expect(getGuildMember("tok", "123")).resolves.toBeNull();
  });

  it("lança erro em falha inesperada do Discord", async () => {
    mockFetch(async () => new Response("", { status: 500 }));
    await expect(getGuildMember("tok", "123")).rejects.toThrow("500");
  });
});

describe("discordAvatarUrl", () => {
  it("monta a URL do CDN", () => {
    expect(discordAvatarUrl("42", "abc")).toBe("https://cdn.discordapp.com/avatars/42/abc.png?size=128");
  });
  it("sem avatar → null", () => {
    expect(discordAvatarUrl("42", null)).toBeNull();
  });
});

describe("sendWebhook", () => {
  it("não faz nada sem URL", async () => {
    const spy = mockFetch(async () => new Response());
    await sendWebhook(undefined, { title: "x" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("envia embed com a cor ciano da Leviata e timestamp", async () => {
    const spy = mockFetch(async () => new Response(null, { status: 204 }));
    await sendWebhook("https://hook", { title: "Aviso", description: "oi" });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.username).toBe("Painel Leviata");
    expect(body.embeds[0]).toMatchObject({ title: "Aviso", description: "oi", color: 0x00d9ff });
    expect(body.embeds[0].timestamp).toBeTruthy();
  });

  it("falha do webhook não quebra a ação", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(async () => { throw new Error("rede caiu"); });
    await expect(sendWebhook("https://hook", { title: "x" })).resolves.toBeUndefined();
  });
});
