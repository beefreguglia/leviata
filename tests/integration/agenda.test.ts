import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  createEvent, deleteEvent, generateLineup, publishLineup, saveLineup, saveReport, setAttendance, setEventStatus, updateEvent,
} from "@/app/(painel)/agenda/actions";
import { toDateTimeInputBRT } from "@/lib/dates";
import { actAs, db, form, memberByName } from "../helpers/db";

let fetchSpy: MockInstance<typeof fetch>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => {
  fetchSpy.mockRestore();
  delete process.env.DISCORD_WEBHOOK_AVISOS;
});

const inHours = (h: number) => toDateTimeInputBRT(new Date(Date.now() + h * 3600_000));

async function newEvent(extra: Record<string, string> = {}) {
  await actAs("dev-gerente");
  await createEvent(form({ title: "Fleeca da praça", kind: "ACAO", startsAt: inHours(24), ...extra })).catch(() => {});
  return db.event.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
}

async function perimeterWithRoles() {
  return db.perimeter.create({
    data: { name: "Fleeca fundos", target: "Fleeca", plan: "x", roles: { create: [{ name: "Piloto", quantity: 2, order: 0 }, { name: "Hacker", quantity: 1, order: 1 }] } },
  });
}

describe("agenda: eventos", () => {
  it("cria evento, avisa no Discord e redireciona", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    await actAs("dev-gerente");
    await expect(createEvent(form({ title: "Corrida", kind: "CORRIDA", startsAt: "2026-12-01T22:00", notifyDiscord: "on" }))).rejects.toMatchObject({
      digest: expect.stringContaining("/agenda/"),
    });
    const ev = await db.event.findFirstOrThrow({ include: { createdBy: true } });
    expect(ev.startsAt.toISOString()).toBe("2026-12-02T01:00:00.000Z");
    expect(ev.createdBy?.rpName).toBe("Rafa Cardoso");
    const embed = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string).embeds[0];
    expect(embed.title).toBe("📅 Corrida: Corrida");
  });

  it("valida término e perímetro", async () => {
    await actAs("dev-gerente");
    expect((await createEvent(form({ title: "Ação", startsAt: "2026-12-01T22:00", endsAt: "2026-12-01T21:00" }))).ok).toBe(false);
    expect(await createEvent(form({ title: "Ação", startsAt: "2026-12-01T22:00", perimeterId: "falso" }))).toEqual({ ok: false, error: "Perímetro inválido" });
  });

  it("editar, cancelar (avisa no Discord), reabrir e apagar", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    const ev = await newEvent();
    expect((await updateEvent(ev.id, form({ title: "Fleeca adiada", kind: "ACAO", startsAt: inHours(48) }))).ok).toBe(true);
    expect(await setEventStatus(ev.id, "CANCELADO")).toEqual({ ok: true, message: "Evento cancelado" });
    expect(fetchSpy.mock.calls.some(([, init]) => String((init as RequestInit).body).includes("❌ Cancelado: Fleeca adiada"))).toBe(true);
    expect(await setEventStatus(ev.id, "AGENDADO")).toEqual({ ok: true, message: "Evento reaberto" });
    await expect(deleteEvent(ev.id)).rejects.toMatchObject({ digest: expect.stringContaining(";/agenda;") });
  });

  it("soldado não agenda", async () => {
    await actAs("dev-soldado");
    expect((await createEvent(form({ title: "Ação", startsAt: "2026-12-01T22:00" }))).ok).toBe(false);
  });
});

describe("agenda: presença", () => {
  it("membro confirma e muda a resposta (uma por membro)", async () => {
    const ev = await newEvent();
    await actAs("dev-soldado");
    expect(await setAttendance(ev.id, "VOU")).toEqual({ ok: true, message: "Presença confirmada" });
    expect(await setAttendance(ev.id, "NAO_VOU")).toEqual({ ok: true, message: "Ok, você não vai" });
    const att = await db.attendance.findMany({ where: { eventId: ev.id } });
    expect(att).toHaveLength(1);
    expect(att[0].status).toBe("NAO_VOU");
  });

  it("não aceita presença em evento cancelado", async () => {
    const ev = await newEvent();
    await setEventStatus(ev.id, "CANCELADO");
    await actAs("dev-soldado");
    expect(await setAttendance(ev.id, "VOU")).toEqual({ ok: false, error: "Esse evento não está mais aberto" });
  });

  it("recruta (sem painel) não responde", async () => {
    const ev = await newEvent();
    await actAs("dev-recruta");
    expect((await setAttendance(ev.id, "VOU")).ok).toBe(false);
  });
});

describe("agenda: escalação", () => {
  it("gera vagas pelo perímetro mantendo quem já estava na função", async () => {
    const p = await perimeterWithRoles();
    const ev = await newEvent({ perimeterId: p.id });
    const nina = await memberByName("Nina Torres");
    await db.lineupSlot.create({ data: { eventId: ev.id, role: "Hacker", memberId: nina.id, order: 0 } });
    expect(await generateLineup(ev.id)).toEqual({ ok: true, message: '3 vagas criadas a partir de "Fleeca fundos"' });
    const slots = await db.lineupSlot.findMany({ where: { eventId: ev.id }, orderBy: { order: "asc" } });
    expect(slots.map((s) => [s.role, s.memberId])).toEqual([["Piloto", null], ["Piloto", null], ["Hacker", nina.id]]);
  });

  it("evento sem perímetro não gera", async () => {
    const ev = await newEvent();
    expect(await generateLineup(ev.id)).toEqual({ ok: false, error: "Esse evento não tem perímetro" });
  });

  it("salva escalação e bloqueia membro repetido", async () => {
    const ev = await newEvent();
    const [nina, rafa] = [await memberByName("Nina Torres"), await memberByName("Rafa Cardoso")];
    const ok = await saveLineup(ev.id, form({ slotRole: ["Piloto", "Hacker"], slotMember: [nina.id, rafa.id], slotVehicle: ["Sultan", ""], slotNotes: ["", ""] }));
    expect(ok).toEqual({ ok: true, message: "Escalação salva" });
    const dup = await saveLineup(ev.id, form({ slotRole: ["Piloto", "Hacker"], slotMember: [nina.id, nina.id], slotVehicle: ["", ""], slotNotes: ["", ""] }));
    expect(dup).toEqual({ ok: false, error: "Nina Torres está em duas vagas" });
    expect(await db.lineupSlot.count({ where: { eventId: ev.id } })).toBe(2);
  });

  it("não escala quem avisou ausência no horário do evento", async () => {
    const ev = await newEvent();
    const nina = await memberByName("Nina Torres");
    await db.absence.create({
      data: { memberId: nina.id, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 3 * 86400_000), reason: "Viagem", status: "APROVADA" },
    });
    const r = await saveLineup(ev.id, form({ slotRole: ["Piloto"], slotMember: [nina.id], slotVehicle: [""], slotNotes: [""] }));
    expect(r).toEqual({ ok: false, error: "Nina Torres está ausente nesse horário" });
  });

  it("ausência recusada não bloqueia; membro afastado bloqueia", async () => {
    const ev = await newEvent();
    const nina = await memberByName("Nina Torres");
    await db.absence.create({
      data: { memberId: nina.id, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 3 * 86400_000), reason: "x", status: "RECUSADA" },
    });
    expect((await saveLineup(ev.id, form({ slotRole: ["Piloto"], slotMember: [nina.id], slotVehicle: [""], slotNotes: [""] }))).ok).toBe(true);
    await db.member.update({ where: { id: nina.id }, data: { status: "AFASTADO" } });
    expect(await saveLineup(ev.id, form({ slotRole: ["Piloto"], slotMember: [nina.id], slotVehicle: [""], slotNotes: [""] }))).toEqual({
      ok: false,
      error: "Nina Torres está afastado nesse horário",
    });
  });

  it("publica no Discord com as funções e marca como publicada", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    const ev = await newEvent();
    expect(await publishLineup(ev.id)).toEqual({ ok: false, error: "Escale pelo menos um membro antes de publicar" });
    const rafa = await memberByName("Rafa Cardoso");
    await saveLineup(ev.id, form({ slotRole: ["Piloto", "Hacker"], slotMember: [rafa.id, ""], slotVehicle: ["Sultan", ""], slotNotes: ["", ""] }));
    const r = await publishLineup(ev.id);
    expect(r.ok).toBe(true);
    expect((await db.event.findUniqueOrThrow({ where: { id: ev.id } })).lineupPublishedAt).toBeInstanceOf(Date);
    const body = String((fetchSpy.mock.calls.at(-1)![1] as RequestInit).body);
    expect(body).toContain("**Piloto** — Rafa Cardoso · 🚗 Sultan");
    expect(body).toContain("**Hacker** — _vaga aberta_");
  });
});

describe("agenda: relatório", () => {
  it("só depois de começar; salvar conclui o evento", async () => {
    const futuro = await newEvent();
    expect(await saveReport(futuro.id, form({ result: "SUCESSO" }))).toEqual({
      ok: false,
      error: "O relatório só pode ser feito depois que o evento começar",
    });
    const passado = await newEvent({ startsAt: inHours(-2) });
    expect(await saveReport(passado.id, form({ result: "PARCIAL", money: "85000", arrests: "1", loot: "2 vitrines" }))).toEqual({
      ok: true,
      message: "Relatório salvo — evento concluído",
    });
    const ev = await db.event.findUniqueOrThrow({ where: { id: passado.id }, include: { report: true } });
    expect(ev.status).toBe("CONCLUIDO");
    expect(ev.report).toMatchObject({ result: "PARCIAL", money: 85000, arrests: 1, casualties: null });
    // editar o relatório atualiza (não duplica)
    await saveReport(passado.id, form({ result: "SUCESSO" }));
    expect(await db.eventReport.count()).toBe(1);
  });
});
