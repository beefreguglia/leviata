"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { sendWebhook } from "@/lib/discord";
import { endOfDayBRT, toDateInputBRT } from "@/lib/dates";
import { parseFlyerForm, parseNoticeForm } from "@/lib/schemas/content";
import { existingUploadIds } from "@/lib/uploads";

function revalidate() {
  revalidatePath("/mural");
  revalidatePath("/dashboard");
}

/** Expira no FIM do dia escolhido. */
const expiry = (d: Date | null) => (d ? endOfDayBRT(toDateInputBRT(d)) : null);

const PRIORITY_COLOR = { NORMAL: 0x06d4ec, IMPORTANTE: 0xfba94c, URGENTE: 0xf75a68 } as const;

export async function createNotice(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const { notifyDiscord, expiresAt, pollOptions, ...data } = parseNoticeForm(fd);
    const notice = await db.notice.create({
      data: {
        ...data,
        expiresAt: expiry(expiresAt),
        authorId: viewer.member?.id,
        pollOptions: { create: pollOptions.map((text, order) => ({ text, order })) },
      },
    });
    await audit({ userId: viewer.user.id, action: "notice.create", entity: "Notice", entityId: notice.id, summary: `Publicou o aviso "${notice.title}"` });
    if (notifyDiscord) {
      await sendWebhook(process.env.DISCORD_WEBHOOK_AVISOS, {
        title: `📢 ${notice.title}`,
        description: [notice.content.slice(0, 1500), pollText(pollOptions)].filter(Boolean).join("\n\n"),
        color: PRIORITY_COLOR[notice.priority],
        fields: notice.priority !== "NORMAL" ? [{ name: "Prioridade", value: notice.priority === "URGENTE" ? "Urgente" : "Importante", inline: true }] : undefined,
      });
    }
    revalidate();
    if (pollOptions.length) return notifyDiscord ? "Enquete publicada e enviada no Discord" : "Enquete publicada";
    return notifyDiscord ? "Aviso publicado e enviado no Discord" : "Aviso publicado";
  });
}

export async function updateNotice(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const { notifyDiscord: _n, expiresAt, pollOptions, ...data } = parseNoticeForm(fd);
    void _n;
    const current = await db.notice.findUniqueOrThrow({ where: { id }, include: { pollOptions: { orderBy: { order: "asc" } }, _count: { select: { pollVotes: true } } } });
    const sameOptions = current.pollOptions.map((o) => o.text).join("\n") === pollOptions.join("\n");
    // com votos, as opções ficam travadas (mudar trocaria o sentido dos votos já dados)
    if (!sameOptions && current._count.pollVotes > 0) throw new Error("A enquete já tem votos: as opções não podem mudar");
    const notice = await db.$transaction(async (tx) => {
      if (!sameOptions) {
        await tx.pollOption.deleteMany({ where: { noticeId: id } });
        await tx.pollOption.createMany({ data: pollOptions.map((text, order) => ({ text, order, noticeId: id })) });
      }
      return tx.notice.update({ where: { id }, data: { ...data, expiresAt: expiry(expiresAt) } });
    });
    await audit({ userId: viewer.user.id, action: "notice.update", entity: "Notice", entityId: id, summary: `Editou o aviso "${notice.title}"` });
    revalidate();
    return "Aviso atualizado";
  });
}

function pollText(options: string[]) {
  if (!options.length) return "";
  return "**Enquete — vote no painel:**\n" + options.map((o, i) => `${i + 1}. ${o}`).join("\n");
}

/** Vota (ou troca o voto). Votar de novo na mesma opção tira o voto. */
export async function votePoll(noticeId: string, optionId: string) {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    if (!viewer.member) throw new Error("Sem ficha de membro");
    const notice = await db.notice.findUniqueOrThrow({ where: { id: noticeId }, include: { pollOptions: true } });
    if (!notice.pollOptions.some((o) => o.id === optionId)) throw new Error("Opção inválida");
    if (notice.expiresAt && notice.expiresAt < new Date()) throw new Error("Enquete encerrada");
    const memberId = viewer.member.id;
    const mine = await db.pollVote.findUnique({ where: { noticeId_memberId: { noticeId, memberId } } });
    if (mine?.optionId === optionId) {
      await db.pollVote.delete({ where: { id: mine.id } });
      revalidate();
      return "Voto retirado";
    }
    await db.pollVote.upsert({
      where: { noticeId_memberId: { noticeId, memberId } },
      create: { noticeId, optionId, memberId },
      update: { optionId, createdAt: new Date() },
    });
    revalidate();
    return mine ? "Voto trocado" : "Voto registrado";
  });
}

export async function toggleNoticePin(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const current = await db.notice.findUniqueOrThrow({ where: { id } });
    await db.notice.update({ where: { id }, data: { isPinned: !current.isPinned } });
    await audit({
      userId: viewer.user.id,
      action: "notice.pin",
      entity: "Notice",
      entityId: id,
      summary: `${current.isPinned ? "Desafixou" : "Fixou"} o aviso "${current.title}"`,
    });
    revalidate();
    return current.isPinned ? "Aviso desafixado" : "Aviso fixado no topo";
  });
}

export async function deleteNotice(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const notice = await db.notice.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "notice.delete", entity: "Notice", entityId: id, summary: `Apagou o aviso "${notice.title}"`, data: { content: notice.content } });
    revalidate();
    return "Aviso apagado";
  });
}

export async function createFlyer(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = parseFlyerForm(fd);
    const [imageId] = await existingUploadIds([data.imageId]);
    if (!imageId) throw new Error("Envie a imagem do flyer");
    const flyer = await db.flyer.create({ data: { ...data, imageId, authorId: viewer.member?.id } });
    await audit({ userId: viewer.user.id, action: "flyer.create", entity: "Flyer", entityId: flyer.id, summary: `Publicou o flyer "${flyer.title}"` });
    revalidate();
    return "Flyer publicado";
  });
}

export async function deleteFlyer(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const flyer = await db.flyer.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "flyer.delete", entity: "Flyer", entityId: id, summary: `Apagou o flyer "${flyer.title}"` });
    revalidate();
    return "Flyer apagado";
  });
}
