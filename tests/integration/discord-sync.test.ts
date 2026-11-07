import { afterEach, describe, expect, it, vi } from "vitest";
import { discordSignIn } from "@/lib/discord-sync";
import { db } from "../helpers/db";

function guildReturns(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    status === 200 ? Response.json(body) : new Response("", { status }),
  );
}

const profile = { id: "999", username: "novato", global_name: "Novato", avatar: "abc" };

afterEach(() => vi.restoreAllMocks());

async function linkRole(rankName: string, roleId: string) {
  await db.rank.update({ where: { name: rankName }, data: { discordRoleId: roleId } });
}

describe("login com Discord", () => {
  it("sem DISCORD_GUILD_ID ou token → erro de configuração", async () => {
    await expect(discordSignIn({ accessToken: "t", guildId: undefined, profile })).resolves.toBe("/login?erro=config");
    await expect(discordSignIn({ accessToken: undefined, guildId: "g", profile })).resolves.toBe("/login?erro=config");
  });

  it("quem não está no servidor é barrado e não é salvo", async () => {
    guildReturns(null, 404);
    await expect(discordSignIn({ accessToken: "t", guildId: "g", profile })).resolves.toBe("/login?erro=fora-do-servidor");
    expect(await db.user.findUnique({ where: { discordId: "999" } })).toBeNull();
  });

  it("primeiro login cria usuário e ficha com a patente MAIS ALTA dos cargos", async () => {
    await linkRole("Soldado", "111");
    await linkRole("Gerente", "222");
    guildReturns({ roles: ["111", "222", "333"], nick: "Novato RP" });

    await expect(discordSignIn({ accessToken: "t", guildId: "g", profile })).resolves.toBe(true);

    const user = await db.user.findUniqueOrThrow({ where: { discordId: "999" }, include: { member: { include: { rank: true } } } });
    expect(user.username).toBe("Novato");
    expect(user.avatarUrl).toBe("https://cdn.discordapp.com/avatars/999/abc.png?size=128");
    expect(user.lastLoginAt).toBeInstanceOf(Date);
    expect(user.member?.rpName).toBe("Novato RP");
    expect(user.member?.rank?.name).toBe("Gerente");
  });

  it("sem cargo mapeado: entra, mas fica sem ficha de membro", async () => {
    guildReturns({ roles: ["555"], nick: null });
    await expect(discordSignIn({ accessToken: "t", guildId: "g", profile })).resolves.toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { discordId: "999" }, include: { member: true } });
    expect(user.member).toBeNull();
  });

  it("cargo mudou no Discord → patente atualiza e registra promoção", async () => {
    await linkRole("Soldado", "111");
    await linkRole("Gerente", "222");
    guildReturns({ roles: ["111"], nick: null });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });

    vi.restoreAllMocks();
    guildReturns({ roles: ["111", "222"], nick: null });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });

    const member = await db.member.findFirstOrThrow({
      where: { user: { discordId: "999" } },
      include: { rank: true, promotions: { include: { fromRank: true, toRank: true } } },
    });
    expect(member.rank?.name).toBe("Gerente");
    expect(member.promotions).toHaveLength(1);
    expect(member.promotions[0]).toMatchObject({ reason: "Sincronizado do cargo no Discord" });
    expect(member.promotions[0].fromRank?.name).toBe("Soldado");
    expect(member.promotions[0].toRank?.name).toBe("Gerente");
  });

  it("login repetido sem mudança não cria promoção nem duplica usuário", async () => {
    await linkRole("Soldado", "111");
    guildReturns({ roles: ["111"], nick: null });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    expect(await db.user.count({ where: { discordId: "999" } })).toBe(1);
    expect(await db.promotion.count()).toBe(0);
  });
});

import { isBootstrapAdmin } from "@/lib/discord-sync";

describe("acesso inicial (BOOTSTRAP_ADMIN_DISCORD_IDS)", () => {
  afterEach(() => {
    delete process.env.BOOTSTRAP_ADMIN_DISCORD_IDS;
  });

  it("lê a lista separada por vírgula/espaço", () => {
    expect(isBootstrapAdmin("2", "1, 2;3")).toBe(true);
    expect(isBootstrapAdmin("4", "1, 2;3")).toBe(false);
    expect(isBootstrapAdmin("1", undefined)).toBe(false);
  });

  it("listado e sem cargo mapeado → entra com a patente mais alta", async () => {
    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "999";
    guildReturns({ roles: [], nick: "Chefe" });
    await expect(discordSignIn({ accessToken: "t", guildId: "g", profile })).resolves.toBe(true);
    const m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } }, include: { rank: true } });
    expect(m.rank?.name).toBe("Líder");
  });

  it("não listado e sem cargo → sem ficha (como antes)", async () => {
    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "123";
    guildReturns({ roles: [], nick: null });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    expect(await db.member.count({ where: { user: { discordId: "999" } } })).toBe(0);
  });

  it("cargo mapeado tem prioridade sobre o bootstrap", async () => {
    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "999";
    await linkRole("Soldado", "111");
    guildReturns({ roles: ["111"], nick: null });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    const m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } }, include: { rank: true } });
    expect(m.rank?.name).toBe("Soldado");
  });
});
