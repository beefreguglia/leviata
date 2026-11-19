import { describe, expect, it } from "vitest";
import { addFactionEvent, createFaction, deleteFaction, deleteFactionEvent, updateFaction } from "@/app/(painel)/faccoes/actions";
import { actAs, db, form } from "../helpers/db";

const ballas = (o: Record<string, string> = {}) => form({ name: "Ballas", tag: "BL", color: "#8e44ad", relation: "TENSA", isActive: "on", ...o });

describe("facções", () => {
  it("cadastra e não deixa nome repetido (sem diferenciar maiúsculas)", async () => {
    await actAs("dev-gerente");
    expect(await createFaction(ballas())).toEqual({ ok: true, message: "Ballas cadastrada" });
    expect(await createFaction(ballas({ name: "BALLAS" }))).toEqual({ ok: false, error: "Já existe a facção Ballas" });
  });

  it("salva o 01 (líder) e o 02 (vice-líder)", async () => {
    await actAs("dev-gerente");
    await createFaction(ballas({ leader: "Big T", viceLeader: "Little D" }));
    const f = await db.faction.findFirstOrThrow();
    expect(f).toMatchObject({ leader: "Big T", viceLeader: "Little D" });
    await updateFaction(f.id, ballas({ leader: "Big T", viceLeader: "" }));
    expect((await db.faction.findUniqueOrThrow({ where: { id: f.id } })).viceLeader).toBeNull();
  });

  it("segunda cor só vale com a caixa marcada", async () => {
    await actAs("dev-gerente");
    await createFaction(ballas({ color2: "#000000", hasColor2: "on" }));
    const f = await db.faction.findFirstOrThrow();
    expect(f.color2).toBe("#000000");
    await updateFaction(f.id, ballas({ color2: "#000000" }));
    expect((await db.faction.findUniqueOrThrow({ where: { id: f.id } })).color2).toBeNull();
    expect((await updateFaction(f.id, ballas({ color2: "vermelho", hasColor2: "on" }))).ok).toBe(false);
  });

  it("mudar a relação registra no histórico automaticamente", async () => {
    await actAs("dev-gerente");
    await createFaction(ballas());
    const f = await db.faction.findFirstOrThrow();
    await updateFaction(f.id, ballas({ relation: "GUERRA" }));
    const ev = await db.factionEvent.findFirstOrThrow({ where: { factionId: f.id } });
    expect(ev).toMatchObject({ kind: "RELACAO", title: "Relação: Tensa → Em guerra" });
    // editar sem mudar a relação não cria outro evento
    await updateFaction(f.id, ballas({ relation: "GUERRA", territory: "Davis" }));
    expect(await db.factionEvent.count({ where: { factionId: f.id } })).toBe(1);
  });

  it("registra e remove eventos do histórico", async () => {
    await actAs("dev-gerente");
    await createFaction(ballas());
    const f = await db.faction.findFirstOrThrow();
    expect((await addFactionEvent(f.id, form({ kind: "CONFLITO", title: "Tiroteio na praça", happenedAt: "2026-11-01" }))).ok).toBe(true);
    const ev = await db.factionEvent.findFirstOrThrow({ include: { author: true } });
    expect(ev.author?.rpName).toBe("Rafa Cardoso");
    expect((await deleteFactionEvent(ev.id)).ok).toBe(true);
    expect(await db.factionEvent.count()).toBe(0);
  });

  it("apagar facção apaga o histórico e redireciona", async () => {
    await actAs("dev-lider");
    await createFaction(ballas());
    const f = await db.faction.findFirstOrThrow();
    await addFactionEvent(f.id, form({ kind: "OUTRO", title: "Algo aconteceu" }));
    await expect(deleteFaction(f.id)).rejects.toMatchObject({ digest: expect.stringContaining(";/faccoes?ok=apagado;") });
    expect(await db.factionEvent.count()).toBe(0);
  });

  it("soldado só lê", async () => {
    await actAs("dev-soldado");
    expect((await createFaction(ballas())).ok).toBe(false);
  });
});
