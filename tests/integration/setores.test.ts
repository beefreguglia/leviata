import { afterEach, describe, expect, it, vi } from "vitest";
import { createManagement, createSector, deleteSector, updateSector } from "@/app/(painel)/hierarquia/actions";
import { setMemberSector } from "@/app/(painel)/membros/actions";
import { discordSignIn } from "@/lib/discord-sync";
import { getViewer } from "@/lib/session";
import { applyLeviataStructure, LEVIATA_RANKS } from "../../prisma/leviata-structure";
import { actAs, db, form, memberByName, setRankPerms, GERENCIA_COMPLETA } from "../helpers/db";

const profile = { id: "999", username: "novato", global_name: "Novato", avatar: null };
function guildReturns(roles: string[], nick: string | null = null) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ roles, nick }));
}
const sector = (name: string) => db.sector.findUniqueOrThrow({ where: { name } });
const management = (name: string) => db.management.findUniqueOrThrow({ where: { name } });

afterEach(() => vi.restoreAllMocks());

describe("setores e gerências: permissões", () => {
  it("permissões = patente + gerências", async () => {
    const nina = await memberByName("Nina Torres");
    await actAs("dev-soldado");
    expect((await getViewer())?.can("financeiro.gerenciar")).toBe(false);
    await db.member.update({ where: { id: nina.id }, data: { managements: { connect: { id: (await management("G-Comércio")).id } } } });
    const v = await getViewer();
    expect(v?.can("financeiro.gerenciar")).toBe(true);
    expect(v?.can("economia.ver")).toBe(true);
    expect(v?.can("punicoes.gerenciar")).toBe(false);
  });
});

describe("setores e gerências: cargos do Discord", () => {
  it("login com servidor: setor e gerências seguem os cargos", async () => {
    await db.sector.update({ where: { name: "Vanguarda" }, data: { discordRoleId: "900" } });
    await db.management.update({ where: { name: "G-Ação" }, data: { discordRoleId: "901" } });
    guildReturns(["900", "901"]);
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    let m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } }, include: { sector: true, managements: true } });
    expect(m.sector?.name).toBe("Vanguarda");
    expect(m.managements.map((g) => g.name)).toEqual(["G-Ação"]);

    // tirou os cargos no Discord → sai do setor e da gerência
    guildReturns([]);
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } }, include: { sector: true, managements: true } });
    expect(m.sectorId).toBeNull();
    expect(m.managements).toEqual([]);
  });

  it("o que foi dado no painel sem cargo ligado não é apagado pelo login", async () => {
    await db.sector.update({ where: { name: "Propulsão" }, data: { discordRoleId: null } });
    await db.management.update({ where: { name: "G-Corrida" }, data: { discordRoleId: null } });
    guildReturns([]);
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    const m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } } });
    await db.member.update({
      where: { id: m.id },
      data: { sectorId: (await sector("Propulsão")).id, managements: { connect: { id: (await management("G-Corrida")).id } } },
    });
    await discordSignIn({ accessToken: "t", guildId: "g", profile });
    const after = await db.member.findUniqueOrThrow({ where: { id: m.id }, include: { sector: true, managements: true } });
    expect(after.sector?.name).toBe("Propulsão");
    expect(after.managements.map((g) => g.name)).toEqual(["G-Corrida"]);
  });

  it("sem servidor conectado, nada de setor/gerência é mexido", async () => {
    await discordSignIn({ accessToken: "t", guildId: undefined, profile });
    const m = await db.member.findFirstOrThrow({ where: { user: { discordId: "999" } }, include: { managements: true } });
    expect(m.sectorId).toBeNull();
    expect(m.managements).toEqual([]);
  });
});

describe("setores e gerências: ações", () => {
  it("cria, edita e não apaga setor com membros; cargo repetido é recusado", async () => {
    await actAs("dev-lider");
    expect(await createSector(form({ name: "Logística", description: "Carga", color: "#123456", order: "5", discordRoleId: "777" }))).toEqual({ ok: true, message: "Setor Logística criado" });
    expect(await createSector(form({ name: "Outro", color: "#123456", discordRoleId: "777" }))).toEqual({ ok: false, error: "O cargo 777 já está ligado a Logística" });
    const s = await sector("Logística");
    expect((await updateSector(s.id, form({ name: "Logística", color: "#654321", discordRoleId: "" }))).ok).toBe(true);
    const nina = await memberByName("Nina Torres");
    await db.member.update({ where: { id: nina.id }, data: { sectorId: s.id } });
    expect(await deleteSector(s.id)).toEqual({ ok: false, error: "Tire os 1 membros deste setor antes de apagar" });
  });

  it("gerência nova com permissões", async () => {
    await actAs("dev-lider");
    expect(await createManagement(form({ name: "G-Logística", permissions: ["painel.ver", "operacoes.gerenciar", "inventada"] }))).toEqual({ ok: true, message: "Gerência G-Logística criada" });
    expect((await management("G-Logística")).permissions).toEqual(["painel.ver", "operacoes.gerenciar"]);
  });

  it("quem gerencia membros muda o setor; gerências só com hierarquia", async () => {
    await setRankPerms("Gerente", GERENCIA_COMPLETA);
    const nina = await memberByName("Nina Torres");
    const vanguarda = await sector("Vanguarda");
    const gAcao = await management("G-Ação");
    await actAs("dev-gerente");
    expect(await setMemberSector(nina.id, form({ sectorId: vanguarda.id }))).toEqual({ ok: true, message: "Setor e gerências atualizados" });
    expect((await db.member.findUniqueOrThrow({ where: { id: nina.id } })).sectorId).toBe(vanguarda.id);
    expect(await setMemberSector(nina.id, form({ sectorId: vanguarda.id, managementsField: "1", managementIds: [gAcao.id] }))).toEqual({
      ok: false,
      error: "Só quem gerencia a hierarquia muda gerências",
    });
    await actAs("dev-lider");
    expect((await setMemberSector(nina.id, form({ sectorId: "", managementsField: "1", managementIds: [gAcao.id] }))).ok).toBe(true);
    const after = await db.member.findUniqueOrThrow({ where: { id: nina.id }, include: { managements: true } });
    expect(after.sectorId).toBeNull();
    expect(after.managements.map((g) => g.name)).toEqual(["G-Ação"]);
    await actAs("dev-soldado");
    expect((await setMemberSector(nina.id, form({ sectorId: vanguarda.id }))).ok).toBe(false);
  });
});

describe("estrutura oficial da Leviatã", () => {
  it("troca as patentes antigas, move os membros e liga os cargos (idempotente)", async () => {
    await applyLeviataStructure(db);
    await applyLeviataStructure(db);
    const ranks = await db.rank.findMany({ orderBy: { order: "asc" } });
    expect(ranks.map((r) => [r.name, r.order, r.discordRoleId])).toEqual(LEVIATA_RANKS.map((r) => [r.name, r.order, r.discordRoleId]));
    const who = async (n: string) => (await memberByName(n)).rank?.name;
    expect(await who("Dante Moretti")).toBe("Hierarquia");
    expect(await who("Rafa Cardoso")).toBe("Membro");
    expect(await who("Nina Torres")).toBe("Membro");
    expect(await who("Léo Vieira")).toBe("Recruta");
    expect((await sector("Comércio")).discordRoleId).toBe("1534404775171330106");
    expect((await management("G-Comércio")).discordRoleId).toBe("1534404775171330106");
    expect((await management("G-Ação")).sectorId).toBe((await sector("Vanguarda")).id);
  });
});
