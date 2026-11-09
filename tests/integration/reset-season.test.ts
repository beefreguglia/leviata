import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { discordSignIn } from "@/lib/discord-sync";
import { LEVIATA_MANAGEMENTS, LEVIATA_RANKS, LEVIATA_SECTORS } from "../../prisma/leviata-structure";
import { planSeasonReset, rebuildSeasonBase, SEASON_REBUILT_TABLES, SEASON_WIPED_TABLES, wipeSeasonData } from "../../prisma/season-reset";
import { db, memberByName } from "../helpers/db";

async function addUpload(key: string, uploaderId: string | null) {
  return db.upload.create({ data: { key, name: key, mime: "image/png", size: 1, uploaderId } });
}

/** Banco com mapa, imagem comum, regra editada e a marca dos anúncios do Discord. */
async function scenario() {
  const member = await memberByName("Dante Moretti");
  const mapUpload = await addUpload("mapa.png", member.id);
  await addUpload("flyer.png", member.id);
  await db.setting.create({ data: { key: "mapa", value: { imageId: mapUpload.id, width: 100, height: 100 } } });
  await db.setting.create({ data: { key: "changelog.anunciados", value: ["2026-11-07-economia-metas"] } });
  await db.rulePage.update({ where: { slug: "estatuto" }, data: { content: "editada no teste" } });
  await db.rulePage.create({ data: { slug: "regra-de-teste", title: "Teste", content: "x" } });
}

afterEach(() => vi.restoreAllMocks());

describe("reset de season", () => {
  it("toda tabela do banco está classificada uma única vez", () => {
    const classified = [...SEASON_REBUILT_TABLES, ...SEASON_WIPED_TABLES, "Setting"].sort();
    expect(classified).toEqual(Object.values(Prisma.ModelName).sort());
  });

  it("a simulação não altera nada", async () => {
    await scenario();
    const members = await db.member.count();
    const plan = await planSeasonReset(db);
    expect(plan.wiped.Member).toBe(members);
    expect(plan.wiped.Upload).toBe(2);
    expect(await db.member.count()).toBe(members);
    expect(await db.upload.count()).toBe(2);
  });

  it("apaga tudo, inclusive o mapa, e devolve as imagens para remover do storage", async () => {
    await scenario();

    const { fileKeys } = await wipeSeasonData(db);

    expect(fileKeys.sort()).toEqual(["flyer.png", "mapa.png"]);
    const after = await planSeasonReset(db);
    for (const table of SEASON_WIPED_TABLES) expect(after.wiped[table], table).toBe(0);
    for (const table of SEASON_REBUILT_TABLES) expect(after.rebuilt[table], table).toBe(0);
    expect(await db.setting.findUnique({ where: { key: "mapa" } })).toBeNull();
    expect(await db.setting.findUnique({ where: { key: "changelog.anunciados" } })).not.toBeNull();
  });

  it("recria a estrutura oficial e as regras iniciais", async () => {
    await scenario();
    await wipeSeasonData(db);
    await rebuildSeasonBase(db);

    expect((await db.rank.findMany({ orderBy: { order: "asc" } })).map((r) => r.name)).toEqual(LEVIATA_RANKS.map((r) => r.name));
    expect(await db.sector.count()).toBe(LEVIATA_SECTORS.length);
    expect(await db.management.count()).toBe(LEVIATA_MANAGEMENTS.length);
    expect((await db.rulePage.findUniqueOrThrow({ where: { slug: "estatuto" } })).content).not.toBe("editada no teste");
    expect(await db.rulePage.findUnique({ where: { slug: "regra-de-teste" } })).toBeNull();
  });

  it("depois do reset a pessoa entra de novo e a ficha nasce com a patente do Discord", async () => {
    await scenario();
    await wipeSeasonData(db);
    await rebuildSeasonBase(db);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ roles: ["1534404775171330101"], nick: "Novato" }));

    const result = await discordSignIn({
      accessToken: "token",
      guildId: "guild-teste",
      profile: { id: "999", username: "novato", global_name: "Novato", avatar: null },
    });

    expect(result).toBe(true);
    expect((await memberByName("Novato")).rank?.name).toBe("Recruta");
  });
});
