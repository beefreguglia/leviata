import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createFlyer, createNotice, deleteFlyer, deleteNotice, toggleNoticePin, updateNotice } from "@/app/(painel)/mural/actions";
import { actAs, day, db, form, makeUpload } from "../helpers/db";

let fetchSpy: MockInstance<typeof fetch>;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => {
  fetchSpy.mockRestore();
  delete process.env.DISCORD_WEBHOOK_AVISOS;
});

describe("mural: avisos", () => {
  it("gerente publica aviso fixado e manda no Discord", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    await actAs("dev-gerente");
    const r = await createNotice(form({ title: "Reunião geral", content: "Sábado 20h", priority: "URGENTE", isPinned: "on", notifyDiscord: "on" }));
    expect(r).toEqual({ ok: true, message: "Aviso publicado e enviado no Discord" });
    const n = await db.notice.findFirstOrThrow({ include: { author: true } });
    expect(n).toMatchObject({ isPinned: true, priority: "URGENTE" });
    expect(n.author?.rpName).toBe("Rafa Cardoso");
    const embed = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string).embeds[0];
    expect(embed.title).toBe("📢 Reunião geral");
    expect(embed.color).toBe(0xf75a68);
  });

  it("sem marcar Discord, não envia", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    await actAs("dev-gerente");
    await createNotice(form({ title: "Aviso calmo", content: "x" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("expira no fim do dia escolhido", async () => {
    await actAs("dev-gerente");
    await createNotice(form({ title: "Temporário", content: "x", expiresAt: day(2) }));
    const n = await db.notice.findFirstOrThrow();
    expect(n.expiresAt!.toISOString()).toMatch(/T02:59:59\.999Z$/);
  });

  it("editar, fixar/desafixar e apagar (conteúdo vai para a auditoria)", async () => {
    await actAs("dev-gerente");
    await createNotice(form({ title: "Original", content: "texto original" }));
    const n = await db.notice.findFirstOrThrow();
    expect((await updateNotice(n.id, form({ title: "Editado", content: "novo" }))).ok).toBe(true);
    expect(await toggleNoticePin(n.id)).toEqual({ ok: true, message: "Aviso fixado no topo" });
    expect(await toggleNoticePin(n.id)).toEqual({ ok: true, message: "Aviso desafixado" });
    expect((await deleteNotice(n.id)).ok).toBe(true);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "notice.delete" } });
    expect((log.data as { content: string }).content).toBe("novo");
  });

  it("soldado não publica", async () => {
    await actAs("dev-soldado");
    expect(await createNotice(form({ title: "Hack aqui", content: "x" }))).toEqual({ ok: false, error: "Sem permissão para esta ação" });
  });
});

describe("mural: flyers", () => {
  it("publica com imagem enviada e apaga", async () => {
    const imageId = await makeUpload();
    await actAs("dev-gerente");
    expect(await createFlyer(form({ title: "Corrida de sábado", imageId, eventDate: day(3) }))).toEqual({ ok: true, message: "Flyer publicado" });
    const f = await db.flyer.findFirstOrThrow();
    expect(f.imageId).toBe(imageId);
    expect((await deleteFlyer(f.id)).ok).toBe(true);
  });

  it("id de imagem que não existe é recusado", async () => {
    await actAs("dev-gerente");
    expect(await createFlyer(form({ title: "Corrida", imageId: "falso" }))).toEqual({ ok: false, error: "Envie a imagem do flyer" });
  });
});
