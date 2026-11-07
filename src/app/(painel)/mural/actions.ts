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

const PRIORITY_COLOR = { NORMAL: 0x00d9ff, IMPORTANTE: 0xfba94c, URGENTE: 0xf75a68 } as const;

export async function createNotice(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const { notifyDiscord, expiresAt, ...data } = parseNoticeForm(fd);
    const notice = await db.notice.create({ data: { ...data, expiresAt: expiry(expiresAt), authorId: viewer.member?.id } });
    await audit({ userId: viewer.user.id, action: "notice.create", entity: "Notice", entityId: notice.id, summary: `Publicou o aviso "${notice.title}"` });
    if (notifyDiscord) {
      await sendWebhook(process.env.DISCORD_WEBHOOK_AVISOS, {
        title: `📢 ${notice.title}`,
        description: notice.content.slice(0, 1800),
        color: PRIORITY_COLOR[notice.priority],
        fields: notice.priority !== "NORMAL" ? [{ name: "Prioridade", value: notice.priority === "URGENTE" ? "Urgente" : "Importante", inline: true }] : undefined,
      });
    }
    revalidate();
    return notifyDiscord ? "Aviso publicado e enviado no Discord" : "Aviso publicado";
  });
}

export async function updateNotice(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const { notifyDiscord: _n, expiresAt, ...data } = parseNoticeForm(fd);
    void _n;
    const notice = await db.notice.update({ where: { id }, data: { ...data, expiresAt: expiry(expiresAt) } });
    await audit({ userId: viewer.user.id, action: "notice.update", entity: "Notice", entityId: id, summary: `Editou o aviso "${notice.title}"` });
    revalidate();
    return "Aviso atualizado";
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
