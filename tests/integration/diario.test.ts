import { describe, expect, it } from "vitest";
import { createDiaryEntry, deleteDiaryEntry, updateDiaryEntry } from "@/app/(painel)/diario/actions";
import { toDateTimeInputBRT } from "@/lib/dates";
import { actAs, db, form, setRankPerms } from "../helpers/db";

const ago = (min: number) => toDateTimeInputBRT(new Date(Date.now() - min * 60_000));
const entry = (o: Record<string, string> = {}) => form({ title: "Tiroteio na Grove", kind: "CONFLITO", happenedAt: ago(60), ...o });

describe("diário", () => {
  it("registra com hora, tipo e facção", async () => {
    await actAs("dev-soldado");
    const ballas = await db.faction.create({ data: { name: "Ballas" } });
    expect(await createDiaryEntry(entry({ factionId: ballas.id, content: "Dois feridos" }))).toEqual({ ok: true, message: "Registrado no diário" });
    const e = await db.diaryEntry.findFirstOrThrow({ include: { author: true } });
    expect(e).toMatchObject({ title: "Tiroteio na Grove", kind: "CONFLITO", factionId: ballas.id, content: "Dois feridos" });
    expect(e.author).not.toBeNull();
    expect(await db.auditLog.count({ where: { action: "diary.create" } })).toBe(1);
  });

  it("não aceita data no futuro nem campos inválidos", async () => {
    await actAs("dev-soldado");
    expect((await createDiaryEntry(entry({ happenedAt: ago(-24 * 60) }))).ok).toBe(false);
    expect((await createDiaryEntry(entry({ title: "x" }))).ok).toBe(false);
    expect((await createDiaryEntry(entry({ happenedAt: "" }))).ok).toBe(false);
    expect(await db.diaryEntry.count()).toBe(0);
  });

  it("o autor mexe no próprio registro; nos dos outros precisa de editar/apagar", async () => {
    await actAs("dev-soldado");
    await createDiaryEntry(entry());
    const e = await db.diaryEntry.findFirstOrThrow();
    expect((await updateDiaryEntry(e.id, entry({ title: "Tiroteio na Grove Street" }))).ok).toBe(true);

    await setRankPerms("Recruta", ["painel.ver"]); // sem diario.*
    await actAs("dev-recruta");
    expect((await createDiaryEntry(entry())).ok).toBe(false);
    expect((await deleteDiaryEntry(e.id)).ok).toBe(false);

    await actAs("dev-gerente"); // tem diario.editar e diario.apagar
    expect((await updateDiaryEntry(e.id, entry({ title: "Corrigido pela gerência" }))).ok).toBe(true);
    expect(await deleteDiaryEntry(e.id)).toEqual({ ok: true, message: "Registro apagado" });
    expect(await db.diaryEntry.count()).toBe(0);
  });

  it("soldado não mexe no registro de outro membro", async () => {
    await actAs("dev-gerente");
    await createDiaryEntry(entry());
    const e = await db.diaryEntry.findFirstOrThrow();
    await actAs("dev-soldado");
    expect((await updateDiaryEntry(e.id, entry({ title: "Mudei" }))).ok).toBe(false);
    expect((await deleteDiaryEntry(e.id)).ok).toBe(false);
    expect((await db.diaryEntry.findUniqueOrThrow({ where: { id: e.id } })).title).toBe("Tiroteio na Grove");
  });
});
