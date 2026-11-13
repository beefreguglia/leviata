import { beforeEach, describe, expect, it } from "vitest";
import { dismissMember, readmitMember, updateMember } from "@/app/(painel)/membros/actions";
import { getViewer } from "@/lib/session";
import { actAs, db, form, memberByName, setRankPerms, GERENCIA_COMPLETA } from "../helpers/db";

beforeEach(async () => {
  await setRankPerms("Gerente", GERENCIA_COMPLETA);
});

describe("desligar membro", () => {
  it("quis sair: tira o acesso, guarda motivo e data, sem punição", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    expect(await dismissMember(nina.id, form({ kind: "SAIU", reason: "Pediu para sair no Discord" }))).toEqual({
      ok: true,
      message: "Nina Torres foi desligado",
    });
    const after = await db.member.findUniqueOrThrow({ where: { id: nina.id } });
    expect(after).toMatchObject({ status: "SAIU", leftReason: "Pediu para sair no Discord" });
    expect(after.leftAt).toBeInstanceOf(Date);
    expect(await db.punishment.count({ where: { memberId: nina.id } })).toBe(0);
    expect(await db.auditLog.findFirst({ where: { action: "member.dismiss", entityId: nina.id } })).not.toBeNull();

    await actAs("dev-soldado");
    expect((await getViewer())?.permissions).toEqual([]);
  });

  it("expulsão também vira punição; readmitir anula e devolve o acesso", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    await dismissMember(nina.id, form({ kind: "EXPULSO", reason: "Traição" }));
    expect((await memberByName("Nina Torres")).status).toBe("EXPULSO");
    expect(await db.punishment.findFirstOrThrow({ where: { memberId: nina.id } })).toMatchObject({ kind: "EXPULSAO", status: "ATIVA" });

    expect(await readmitMember(nina.id)).toEqual({ ok: true, message: "Nina Torres voltou para a fac" });
    expect(await db.member.findUniqueOrThrow({ where: { id: nina.id } })).toMatchObject({ status: "ATIVO", leftAt: null, leftReason: null });
    expect(await db.punishment.findFirstOrThrow({ where: { memberId: nina.id } })).toMatchObject({ status: "REVOGADA" });
    await actAs("dev-soldado");
    expect((await getViewer())?.permissions.length).toBeGreaterThan(0);
  });

  it("editar a ficha de quem saiu não traz de volta", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    await dismissMember(nina.id, form({ kind: "SAIU", reason: "Mudou de cidade" }));
    expect((await updateMember(nina.id, form({ rpName: "Nina Torres", passport: "1187", phone: "(055) 118-787", status: "ATIVO" }))).ok).toBe(true);
    expect((await memberByName("Nina Torres")).status).toBe("SAIU");
  });

  it("regras: motivo obrigatório, ninguém se desliga, só abaixo da própria patente, soldado não desliga", async () => {
    await actAs("dev-gerente");
    const nina = await memberByName("Nina Torres");
    const rafa = await memberByName("Rafa Cardoso");
    const dante = await memberByName("Dante Moretti");
    expect(await dismissMember(nina.id, form({ kind: "SAIU", reason: "" }))).toEqual({ ok: false, error: "Explique o motivo" });
    expect(await dismissMember(nina.id, form({ reason: "Sem tipo" }))).toEqual({ ok: false, error: "Escolha o motivo do desligamento" });
    expect(await dismissMember(rafa.id, form({ kind: "SAIU", reason: "Eu mesmo" }))).toEqual({ ok: false, error: "Você não pode desligar a si mesmo" });
    expect(await dismissMember(dante.id, form({ kind: "EXPULSO", reason: "Golpe" }))).toEqual({
      ok: false,
      error: "Você só pode desligar membros de patente abaixo da sua",
    });

    await actAs("dev-soldado");
    const leo = await memberByName("Léo Vieira");
    expect(await dismissMember(leo.id, form({ kind: "SAIU", reason: "Tentativa" }))).toEqual({ ok: false, error: "Sem permissão para esta ação" });
    expect((await memberByName("Léo Vieira")).status).toBe("ATIVO");
  });
});
