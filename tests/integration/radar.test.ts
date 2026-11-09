import { describe, expect, it } from "vitest";
import { getViewer } from "@/lib/session";
import { loadRadar } from "@/lib/radar-data";
import { LEVIATA_MANAGEMENTS } from "../../prisma/leviata-structure";
import { actAs, db, memberByName } from "../helpers/db";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const inRadar = async (id: string) => (await loadRadar()).some((r) => r.member.id === id);

async function veteran(name = "Nina Torres") {
  const member = await memberByName(name);
  await db.member.update({ where: { id: member.id }, data: { joinedAt: daysAgo(30) } });
  return member;
}

async function deliver(memberId: string, createdAt: Date, status: "CONFIRMADA" | "PENDENTE" | "ESTORNADA") {
  const item = await db.item.upsert({ where: { name: "Radar" }, create: { name: "Radar" }, update: {} });
  await db.vaultTransaction.create({ data: { asset: "ITEM", kind: "ENTRADA", quantity: 1, itemId: item.id, memberId, status, createdAt } });
}

describe("radar de inatividade", () => {
  it("quem entrou há tempo e não fez nada aparece; recém-chegado não", async () => {
    const nina = await veteran();
    const leo = await memberByName("Léo Vieira");
    expect(await inRadar(nina.id)).toBe(true);
    expect(await inRadar(leo.id)).toBe(false);
  });

  it("entrega recente tira do radar, mesmo pendente; estornada não conta", async () => {
    const nina = await veteran();
    await deliver(nina.id, daysAgo(1), "ESTORNADA");
    expect(await inRadar(nina.id)).toBe(true);
    await deliver(nina.id, daysAgo(1), "PENDENTE");
    expect(await inRadar(nina.id)).toBe(false);
  });

  it("responder presença recente tira do radar", async () => {
    const nina = await veteran();
    const event = await db.event.create({ data: { title: "Ação", startsAt: new Date() } });
    await db.attendance.create({ data: { eventId: event.id, memberId: nina.id, status: "NAO_VOU" } });
    expect(await inRadar(nina.id)).toBe(false);
  });

  it("ausência ativa tira do radar; recusada não", async () => {
    const nina = await veteran();
    const absence = { memberId: nina.id, startsAt: daysAgo(1), endsAt: daysAgo(-3), reason: "Viagem" };
    await db.absence.create({ data: { ...absence, status: "RECUSADA" } });
    expect(await inRadar(nina.id)).toBe(true);
    await db.absence.create({ data: { ...absence, status: "APROVADA" } });
    expect(await inRadar(nina.id)).toBe(false);
  });

  it("só quem não está ativo fica fora da lista", async () => {
    const nina = await veteran();
    await db.member.update({ where: { id: nina.id }, data: { status: "AFASTADO" } });
    expect(await inRadar(nina.id)).toBe(false);
  });

  it("todas as gerências oficiais veem o radar", async () => {
    for (const g of LEVIATA_MANAGEMENTS) expect(g.permissions, g.name).toContain("radar.ver");
    await actAs("dev-soldado");
    expect((await getViewer())?.can("radar.ver")).toBe(false);
  });
});
