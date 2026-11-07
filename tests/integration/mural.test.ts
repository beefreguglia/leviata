import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createFlyer, createNotice, deleteFlyer, deleteNotice, toggleNoticePin, updateNotice, votePoll } from "@/app/(painel)/mural/actions";
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

describe("enquetes", () => {
  async function newPoll(extra: Record<string, string> = {}) {
    await actAs("dev-gerente");
    const r = await createNotice(form({ title: "Melhor dia da reunião?", pollOptions: "Sábado 20h\n\nDomingo 21h\n", ...extra }));
    expect(r).toEqual({ ok: true, message: "Enquete publicada" });
    return db.notice.findFirstOrThrow({ orderBy: { createdAt: "desc" }, include: { pollOptions: { orderBy: { order: "asc" } } } });
  }

  it("cria enquete só com título e opções (linhas vazias ignoradas)", async () => {
    const n = await newPoll();
    expect(n.content).toBe("");
    expect(n.pollOptions.map((o) => o.text)).toEqual(["Sábado 20h", "Domingo 21h"]);
  });

  it("valida as opções", async () => {
    await actAs("dev-gerente");
    expect(await createNotice(form({ title: "Enquete", pollOptions: "Só uma" }))).toMatchObject({ ok: false, error: "A enquete precisa de pelo menos 2 opções" });
    expect(await createNotice(form({ title: "Enquete", pollOptions: "Sim\nsim" }))).toMatchObject({ ok: false, error: "Opções da enquete repetidas" });
    expect(await createNotice(form({ title: "Aviso sem nada" }))).toMatchObject({ ok: false, error: "Escreva o aviso" });
  });

  it("um voto por membro: votar troca, votar de novo tira", async () => {
    const n = await newPoll();
    const [sab, dom] = n.pollOptions;
    await actAs("dev-soldado");
    expect(await votePoll(n.id, sab.id)).toEqual({ ok: true, message: "Voto registrado" });
    expect(await votePoll(n.id, dom.id)).toEqual({ ok: true, message: "Voto trocado" });
    expect(await db.pollVote.count()).toBe(1);
    expect((await db.pollVote.findFirstOrThrow()).optionId).toBe(dom.id);
    expect(await votePoll(n.id, dom.id)).toEqual({ ok: true, message: "Voto retirado" });
    expect(await db.pollVote.count()).toBe(0);
  });

  it("recruta vota; opção de outra enquete e enquete encerrada são recusadas", async () => {
    const n = await newPoll();
    const outra = await newPoll({ title: "Outra enquete" });
    await actAs("dev-recruta");
    expect(await votePoll(n.id, outra.pollOptions[0].id)).toEqual({ ok: false, error: "Opção inválida" });
    expect((await votePoll(n.id, n.pollOptions[0].id)).ok).toBe(true);
    await db.notice.update({ where: { id: n.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await votePoll(n.id, n.pollOptions[1].id)).toEqual({ ok: false, error: "Enquete encerrada" });
  });

  it("com votos, as opções ficam travadas; sem votos dá para editar", async () => {
    const n = await newPoll();
    expect(await updateNotice(n.id, form({ title: n.title, pollOptions: "Sexta\nSábado" }))).toEqual({ ok: true, message: "Aviso atualizado" });
    const opts = await db.pollOption.findMany({ where: { noticeId: n.id }, orderBy: { order: "asc" } });
    expect(opts.map((o) => o.text)).toEqual(["Sexta", "Sábado"]);
    await actAs("dev-soldado");
    await votePoll(n.id, opts[0].id);
    await actAs("dev-gerente");
    expect(await updateNotice(n.id, form({ title: n.title, pollOptions: "Outra\nCoisa" }))).toEqual({ ok: false, error: "A enquete já tem votos: as opções não podem mudar" });
    expect((await updateNotice(n.id, form({ title: "Título novo", pollOptions: "Sexta\nSábado" }))).ok).toBe(true);
  });

  it("aviso no Discord leva as opções", async () => {
    process.env.DISCORD_WEBHOOK_AVISOS = "https://discord.test/hook";
    await actAs("dev-gerente");
    expect(await createNotice(form({ title: "Dia?", pollOptions: "Sábado 20h\nDomingo 21h", notifyDiscord: "on" }))).toEqual({
      ok: true,
      message: "Enquete publicada e enviada no Discord",
    });
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(body.embeds[0].description).toContain("1. Sábado 20h\n2. Domingo 21h");
  });
});
