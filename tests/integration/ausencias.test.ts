import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { cancelAbsence, createAbsence, reviewAbsence } from "@/app/(painel)/ausencias/actions";
import { actAs, day, db, form, memberByName } from "../helpers/db";

let fetchSpy: MockInstance<typeof fetch>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => {
  fetchSpy.mockRestore();
  delete process.env.DISCORD_WEBHOOK_AVISOS;
});

const absence = (start: number, end: number, reason = "Viagem") => form({ startsAt: day(start), endsAt: day(end), reason });

describe("ausências: avisar", () => {
  it("soldado avisa → fica pendente", async () => {
    await actAs("dev-soldado");
    expect(await createAbsence(absence(0, 2))).toEqual({ ok: true, message: "Aviso enviado para a liderança" });
    const a = await db.absence.findFirstOrThrow({ include: { member: true } });
    expect(a.status).toBe("PENDENTE");
    expect(a.member.rpName).toBe("Nina Torres");
  });

  it("gerente avisa → já sai aprovada por ele mesmo", async () => {
    await actAs("dev-gerente");
    expect(await createAbsence(absence(1, 3))).toEqual({ ok: true, message: "Ausência registrada" });
    const a = await db.absence.findFirstOrThrow({ include: { reviewer: true } });
    expect(a.status).toBe("APROVADA");
    expect(a.reviewer?.rpName).toBe("Rafa Cardoso");
  });

  it("período sobreposto é recusado", async () => {
    await actAs("dev-soldado");
    await createAbsence(absence(0, 5));
    expect(await createAbsence(absence(3, 7))).toEqual({ ok: false, error: "Você já tem uma ausência nesse período" });
  });

  it("período que já passou é recusado", async () => {
    await actAs("dev-soldado");
    expect(await createAbsence(absence(-5, -2))).toEqual({ ok: false, error: "Essa data já passou" });
  });

  it("recruta (sem painel) não consegue avisar", async () => {
    await actAs("dev-recruta");
    expect((await createAbsence(absence(0, 1))).ok).toBe(false);
  });

  it("envia aviso no webhook do Discord quando configurado", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    await actAs("dev-soldado");
    await createAbsence(absence(0, 2, "Prova da faculdade"));
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.test/hook");
    const embed = JSON.parse(init.body as string).embeds[0];
    expect(embed.description).toContain("Nina Torres");
    expect(embed.fields.find((f: { name: string }) => f.name === "Motivo").value).toBe("Prova da faculdade");
  });

  it("sem webhook configurado não chama o Discord", async () => {
    await actAs("dev-soldado");
    await createAbsence(absence(0, 2));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ausências: aprovar e cancelar", () => {
  async function pendingFromNina() {
    await actAs("dev-soldado");
    await createAbsence(absence(1, 3));
    return db.absence.findFirstOrThrow();
  }

  it("gerente aprova", async () => {
    const a = await pendingFromNina();
    await actAs("dev-gerente");
    expect(await reviewAbsence(a.id, true)).toEqual({ ok: true, message: "Ausência aprovada" });
    expect((await db.absence.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("APROVADA");
  });

  it("gerente recusa", async () => {
    const a = await pendingFromNina();
    await actAs("dev-gerente");
    await reviewAbsence(a.id, false);
    expect((await db.absence.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("RECUSADA");
  });

  it("soldado não aprova a própria ausência", async () => {
    const a = await pendingFromNina();
    expect((await reviewAbsence(a.id, true)).ok).toBe(false);
  });

  it("cancelar antes de começar → CANCELADA", async () => {
    const a = await pendingFromNina();
    expect(await cancelAbsence(a.id)).toEqual({ ok: true, message: "Ausência cancelada" });
    expect((await db.absence.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("CANCELADA");
  });

  it("'Voltei' depois de começar → encerra agora, mantém o registro", async () => {
    await actAs("dev-soldado");
    await createAbsence(absence(0, 5));
    const a = await db.absence.findFirstOrThrow();
    expect(await cancelAbsence(a.id)).toEqual({ ok: true, message: "Bem-vindo de volta!" });
    const after = await db.absence.findUniqueOrThrow({ where: { id: a.id } });
    expect(after.status).toBe("PENDENTE");
    expect(after.endsAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("outro soldado não cancela ausência alheia", async () => {
    const a = await pendingFromNina();
    const otherUser = await db.user.create({ data: { discordId: "outro", username: "outro" } });
    const soldado = await memberByName("Nina Torres");
    await db.member.create({ data: { rpName: "Outro Soldado", userId: otherUser.id, rankId: soldado.rankId } });
    await actAs("outro");
    expect(await cancelAbsence(a.id)).toEqual({ ok: false, error: "Sem permissão" });
  });
});

describe("ausências: depois de voltar", () => {
  it("quem usou 'Voltei' hoje consegue avisar outra ausência começando hoje", async () => {
    await actAs("dev-soldado");
    await createAbsence(absence(0, 2, "Viagem curta"));
    const first = await db.absence.findFirstOrThrow();
    expect((await cancelAbsence(first.id)).ok).toBe(true); // "Voltei"
    expect(await createAbsence(absence(0, 3, "Outra viagem"))).toEqual({ ok: true, message: "Aviso enviado para a liderança" });
    expect(await db.absence.count()).toBe(2);
  });
});
