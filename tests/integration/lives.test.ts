import { afterEach, describe, expect, it, vi } from "vitest";
import { addStreamChannel, refreshStreamsNow, removeStreamChannel } from "@/app/(painel)/lives/actions";
import { GET as cron } from "@/app/api/cron/streams/route";
import { refreshStreams, refreshStreamsIfStale } from "@/lib/stream-refresh";
import { actAs, db, form, memberByName } from "../helpers/db";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;
  delete process.env.DISCORD_WEBHOOK_LIVES;
});

/** Simula as APIs: Kick ao vivo para "nina-live", offline para o resto; Twitch com o login "dante_live" ao vivo. */
function mockPlatforms() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("id.twitch.tv")) return Response.json({ access_token: "tok", expires_in: 3600 });
    if (url.includes("api.twitch.tv/helix/streams"))
      return Response.json({ data: [{ user_login: "dante_live", type: "live", title: "RP com a fac", viewer_count: 99 }] });
    if (url.includes("kick.com/api/v2/channels/nina-live"))
      return Response.json({ livestream: { is_live: true, session_title: "Farmando", viewer_count: 12 } });
    if (url.includes("kick.com/api/v2/channels/")) return Response.json({ livestream: null });
    if (url.includes("discord.test")) return new Response(null, { status: 204 });
    return new Response("not mocked", { status: 500 });
  });
}

describe("canais de live", () => {
  it("membro cadastra o próprio canal a partir do link", async () => {
    await actAs("dev-soldado");
    const r = await addStreamChannel(form({ platform: "TWITCH", handle: "https://twitch.tv/NinaRP" }));
    expect(r.ok).toBe(true);
    expect(await db.streamChannel.findFirstOrThrow()).toMatchObject({ platform: "TWITCH", handle: "ninarp", isLive: false });
  });

  it("canal inválido, repetido e limite de 3", async () => {
    await actAs("dev-soldado");
    expect((await addStreamChannel(form({ platform: "YOUTUBE", handle: "@nina" }))).ok).toBe(false);
    await addStreamChannel(form({ platform: "KICK", handle: "nina1" }));
    expect(await addStreamChannel(form({ platform: "KICK", handle: "kick.com/nina1" }))).toEqual({ ok: false, error: "Você já cadastrou esse canal" });
    await addStreamChannel(form({ platform: "KICK", handle: "nina2" }));
    await addStreamChannel(form({ platform: "KICK", handle: "nina3" }));
    expect(await addStreamChannel(form({ platform: "KICK", handle: "nina4" }))).toEqual({ ok: false, error: "Máximo de 3 canais por membro" });
    await actAs("dev-gerente");
    expect(await addStreamChannel(form({ platform: "KICK", handle: "nina1" }))).toEqual({ ok: false, error: "Esse canal já é de Nina Torres" });
  });

  it("só o dono ou a gerência remove", async () => {
    await actAs("dev-soldado");
    await addStreamChannel(form({ platform: "KICK", handle: "ninastream" }));
    const c = await db.streamChannel.findFirstOrThrow();
    const outro = await db.user.create({ data: { discordId: "outro", username: "outro" } });
    await db.member.create({ data: { rpName: "Outro", userId: outro.id, rankId: (await memberByName("Nina Torres")).rankId } });
    await actAs("outro");
    expect(await removeStreamChannel(c.id)).toEqual({ ok: false, error: "Sem permissão" });
    await actAs("dev-gerente");
    expect((await removeStreamChannel(c.id)).ok).toBe(true);
  });
});

describe("atualização de status", () => {
  async function setup() {
    const nina = await memberByName("Nina Torres");
    const dante = await memberByName("Dante Moretti");
    await db.streamChannel.createMany({
      data: [
        { platform: "KICK", handle: "nina-live", memberId: nina.id },
        { platform: "KICK", handle: "nina-off", memberId: nina.id },
        { platform: "TWITCH", handle: "dante_live", memberId: dante.id },
      ],
    });
  }

  it("grava quem está ao vivo e avisa no Discord só quem ENTROU ao vivo", async () => {
    process.env.TWITCH_CLIENT_ID = "id";
    process.env.TWITCH_CLIENT_SECRET = "s";
    process.env.DISCORD_WEBHOOK_LIVES = "https://discord.test/lives";
    await setup();
    const spy = mockPlatforms();

    expect(await refreshStreams()).toEqual({ checked: 3, live: 2, wentLive: 2, errors: 0 });
    const live = await db.streamChannel.findMany({ where: { isLive: true }, orderBy: { handle: "asc" } });
    expect(live.map((c) => [c.handle, c.title, c.viewers])).toEqual([["dante_live", "RP com a fac", 99], ["nina-live", "Farmando", 12]]);
    const hooks = spy.mock.calls.filter(([u]) => String(u).includes("discord.test"));
    expect(hooks).toHaveLength(2);

    // segunda rodada: continuam ao vivo → sem novo aviso
    expect((await refreshStreams()).wentLive).toBe(0);
  });

  it("plataforma sem configuração vira erro no canal, sem derrubar o resto", async () => {
    await setup();
    mockPlatforms();
    const s = await refreshStreams();
    expect(s).toMatchObject({ checked: 3, live: 1, errors: 1 });
    const tw = await db.streamChannel.findFirstOrThrow({ where: { platform: "TWITCH" } });
    expect(tw.lastError).toMatch(/Twitch não configurada/);
  });

  it("refreshStreamsIfStale não consulta se tudo foi verificado há pouco", async () => {
    await setup();
    await db.streamChannel.updateMany({ data: { checkedAt: new Date() } });
    const spy = mockPlatforms();
    expect(await refreshStreamsIfStale()).toMatchObject({ skipped: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it("botão 'Atualizar agora' é só da gerência", async () => {
    await setup();
    mockPlatforms();
    await actAs("dev-soldado");
    expect((await refreshStreamsNow()).ok).toBe(false);
    await actAs("dev-gerente");
    expect(await refreshStreamsNow()).toMatchObject({ ok: true, message: expect.stringContaining("Verificados 3 canais") });
  });

  it("rota de cron exige o segredo", async () => {
    await setup();
    mockPlatforms();
    expect((await cron(new Request("http://x/api/cron/streams"))).status).toBe(401);
    expect((await cron(new Request("http://x/api/cron/streams", { headers: { authorization: "Bearer errado" } }))).status).toBe(401);
    const ok = await cron(new Request("http://x/api/cron/streams", { headers: { authorization: "Bearer segredo-cron-teste" } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ checked: 3 });
  });
});
