import { describe, expect, it, vi } from "vitest";
import { announce } from "../../scripts/announce-changelog";
import { CHANGELOG } from "@/lib/changelog";
import { db } from "../helpers/db";

const ok = () => vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

describe("anúncio de novidades no Discord", () => {
  it("sem webhook não faz nada", async () => {
    expect(await announce(db, {})).toEqual({ posted: null, reason: "sem DISCORD_WEBHOOK_NOVIDADES" });
  });

  it("primeira vez: posta só a mais nova e marca todas; depois não repete", async () => {
    const fetchImpl = ok();
    const r = await announce(db, { webhook: "https://discord.test/hook", panelUrl: "https://painel.test", fetchImpl });
    expect(r).toEqual({ posted: CHANGELOG[0].id, reason: "ok" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body));
    expect(body.embeds[0].title).toBe(`🆕 ${CHANGELOG[0].title}`);
    expect(body.embeds[0].description).toContain("https://painel.test/novidades");

    const saved = await db.setting.findUniqueOrThrow({ where: { key: "changelog.anunciados" } });
    expect(saved.value).toEqual(CHANGELOG.map((e) => e.id));

    const again = ok();
    expect(await announce(db, { webhook: "https://discord.test/hook", fetchImpl: again })).toEqual({ posted: null, reason: "nada novo" });
    expect(again).not.toHaveBeenCalled();
  });

  it("se o Discord falhar, não marca como anunciado", async () => {
    const fail = vi.fn(async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    await expect(announce(db, { webhook: "https://discord.test/hook", fetchImpl: fail })).rejects.toThrow("Discord respondeu 500");
    expect(await db.setting.findUnique({ where: { key: "changelog.anunciados" } })).toBeNull();
  });
});
