import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { changeRank, createMember, updateMember } from "@/app/(painel)/membros/actions";
import { actAs, db, form, memberByName, rankId, setRankPerms, GERENCIA_COMPLETA } from "../helpers/db";

// estes testes cobrem as regras de cada ação para uma gerência com essas permissões
// (as permissões padrão de cada patente estão em permissoes-padrao.test.ts)
beforeEach(async () => {
  await setRankPerms("Gerente", GERENCIA_COMPLETA);
});

describe("membros: cadastrar", () => {
  it("gerente cadastra membro com patente, promoção inicial e auditoria", async () => {
    await actAs("dev-gerente");
    const r = await createMember(form({ rpName: "Caio Mendes", passport: "1450", rankId: await rankId("Recruta"), status: "ATIVO" }));
    expect(r).toEqual({ ok: true, message: "Caio Mendes cadastrado" });

    const m = await memberByName("Caio Mendes");
    expect(m.passport).toBe("1450");
    expect(m.rank?.name).toBe("Recruta");
    expect(await db.promotion.count({ where: { memberId: m.id, reason: "Entrada na fac" } })).toBe(1);
    expect(await db.auditLog.findFirst({ where: { action: "member.create", entityId: m.id } })).not.toBeNull();
  });

  it("soldado não pode cadastrar", async () => {
    await actAs("dev-soldado");
    expect(await createMember(form({ rpName: "Intruso" }))).toEqual({ ok: false, error: "Sem permissão para esta ação" });
    expect(await db.member.count({ where: { rpName: "Intruso" } })).toBe(0);
  });

  it("passaporte repetido é recusado com o nome do dono", async () => {
    await actAs("dev-gerente");
    const r = await createMember(form({ rpName: "Copia", passport: "1001" }));
    expect(r).toEqual({ ok: false, error: "Passaporte 1001 já é de Dante Moretti" });
  });

  it("validação: nome curto", async () => {
    await actAs("dev-gerente");
    expect(await createMember(form({ rpName: "A" }))).toEqual({ ok: false, error: "Nome RP muito curto" });
  });

  it("sem patente não cria promoção", async () => {
    await actAs("dev-gerente");
    await createMember(form({ rpName: "Sem Patente", rankId: "" }));
    const m = await memberByName("Sem Patente");
    expect(m.rankId).toBeNull();
    expect(await db.promotion.count({ where: { memberId: m.id } })).toBe(0);
  });
});

describe("membros: editar", () => {
  it("atualiza a ficha e registra mudança de status na auditoria", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    const r = await updateMember(nina.id, form({ rpName: "Nina T.", passport: "1187", phone: "(055) 118-787", status: "AFASTADO", notes: "Licença" }));
    expect(r.ok).toBe(true);
    const after = await db.member.findUniqueOrThrow({ where: { id: nina.id } });
    expect(after).toMatchObject({ rpName: "Nina T.", status: "AFASTADO", notes: "Licença" });
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "member.update", entityId: nina.id } });
    expect(log.data).toEqual({ status: ["ATIVO", "AFASTADO"] });
  });

  it("pode manter o próprio passaporte, mas não usar o de outro", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    expect((await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "1187", phone: "(055) 118-787" }))).ok).toBe(true);
    expect(await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "1001", phone: "(055) 118-787" }))).toMatchObject({ ok: false });
  });

  it("soldado não edita", async () => {
    await actAs("dev-soldado");
    const nina = await memberByName("Nina Torres");
    expect((await updateMember(nina.id, form({ rpName: "Hack" }))).ok).toBe(false);
  });
});

describe("membros: patente", () => {
  it("gerente promove recruta a soldado com motivo e histórico", async () => {
    await actAs("dev-gerente");
    const leo = await memberByName("Léo Vieira");
    const r = await changeRank(leo.id, form({ rankId: await rankId("Soldado"), reason: "Bateu meta" }));
    expect(r).toEqual({ ok: true, message: "Patente alterada" });
    const p = await db.promotion.findFirstOrThrow({ where: { memberId: leo.id }, include: { fromRank: true, toRank: true, by: true } });
    expect(p.fromRank?.name).toBe("Recruta");
    expect(p.toRank?.name).toBe("Soldado");
    expect(p.by?.rpName).toBe("Rafa Cardoso");
    expect(p.reason).toBe("Bateu meta");
  });

  it("gerente não pode dar patente igual ou acima da própria", async () => {
    await actAs("dev-gerente");
    const leo = await memberByName("Léo Vieira");
    expect(await changeRank(leo.id, form({ rankId: await rankId("Gerente") }))).toEqual({
      ok: false,
      error: "Você não pode dar uma patente igual ou acima da sua",
    });
    expect((await memberByName("Léo Vieira")).rank?.name).toBe("Recruta");
  });

  it("admin pode dar qualquer patente", async () => {
    await actAs("dev-lider");
    const leo = await memberByName("Léo Vieira");
    expect((await changeRank(leo.id, form({ rankId: await rankId("Sub-líder") }))).ok).toBe(true);
  });

  it("mesma patente é recusada", async () => {
    await actAs("dev-lider");
    const leo = await memberByName("Léo Vieira");
    expect(await changeRank(leo.id, form({ rankId: leo.rankId! }))).toEqual({ ok: false, error: "Essa já é a patente atual" });
  });

  it("tirar a patente (sem patente) é permitido", async () => {
    await actAs("dev-lider");
    const leo = await memberByName("Léo Vieira");
    expect((await changeRank(leo.id, form({ rankId: "" }))).ok).toBe(true);
    expect((await memberByName("Léo Vieira")).rankId).toBeNull();
  });
});

describe("membros: número e ID travados", () => {
  afterEach(() => {
    delete process.env.BOOTSTRAP_ADMIN_DISCORD_IDS;
  });

  it("depois de preenchidos, só o dev altera (nem o líder)", async () => {
    const nina = await memberByName("Nina Torres");
    await actAs("dev-lider");
    expect(await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "9999", phone: "(055) 118-787" }))).toEqual({
      ok: false,
      error: "Número e ID já cadastrados só podem ser alterados pelo dev do painel",
    });
    expect((await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "1187", phone: "" }))).ok).toBe(false);

    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "dev-lider";
    expect((await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "9999", phone: "(055) 000-111" }))).ok).toBe(true);
    expect(await db.member.findUniqueOrThrow({ where: { id: nina.id } })).toMatchObject({ passport: "9999", phone: "(055) 000-111" });
  });

  it("campo vazio pode ser preenchido pela liderança", async () => {
    const nina = await memberByName("Nina Torres");
    await db.member.update({ where: { id: nina.id }, data: { phone: null } });
    await actAs("dev-lider");
    expect((await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "1187", phone: "(055) 222-333" }))).ok).toBe(true);
  });
});
