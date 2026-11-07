"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { sendWebhook } from "@/lib/discord";
import { fmtDateTime, fmtTime } from "@/lib/dates";
import { EVENT_KIND } from "@/lib/labels";
import { unavailableMembers } from "@/lib/availability";
import { lineupProblems, parseEventForm, parseLineupForm, parseReportForm } from "@/lib/schemas/ops";

function revalidate(id?: string) {
  revalidatePath("/agenda");
  if (id) revalidatePath(`/agenda/${id}`);
  revalidatePath("/escalacoes");
  revalidatePath("/dashboard");
}

const hook = () => process.env.DISCORD_WEBHOOK_ACOES || process.env.DISCORD_WEBHOOK_AVISOS;
const panelUrl = (path: string) => (process.env.AUTH_URL ? `${process.env.AUTH_URL.replace(/\/$/, "")}${path}` : undefined);

async function parse(fd: FormData) {
  const data = parseEventForm(fd);
  if (data.perimeterId && !(await db.perimeter.findUnique({ where: { id: data.perimeterId } }))) throw new Error("Perímetro inválido");
  return data;
}

export async function createEvent(fd: FormData) {
  let id = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const { notifyDiscord, ...data } = await parse(fd);
    const ev = await db.event.create({ data: { ...data, createdById: viewer.member?.id } });
    id = ev.id;
    await audit({ userId: viewer.user.id, action: "event.create", entity: "Event", entityId: ev.id, summary: `Agendou "${ev.title}" para ${fmtDateTime(ev.startsAt)}` });
    if (notifyDiscord) {
      await sendWebhook(hook(), {
        title: `📅 ${EVENT_KIND[ev.kind].label}: ${ev.title}`,
        description: ev.description?.slice(0, 1500),
        url: panelUrl(`/agenda/${ev.id}`),
        fields: [
          { name: "Quando", value: fmtDateTime(ev.startsAt), inline: true },
          ...(ev.location ? [{ name: "Onde", value: ev.location, inline: true }] : []),
          { name: "Presença", value: "Confirme no painel → Agenda" },
        ],
      });
    }
    revalidate();
  });
  if (result.ok) redirectWithToast(`/agenda/${id}`, "criado");
  return result;
}

export async function updateEvent(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const { notifyDiscord: _n, ...data } = await parse(fd);
    void _n;
    const ev = await db.event.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "event.update", entity: "Event", entityId: id, summary: `Editou "${ev.title}"` });
    revalidate(id);
    return "Evento atualizado";
  });
}

export async function setEventStatus(id: string, status: "AGENDADO" | "CONCLUIDO" | "CANCELADO") {
  return runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const ev = await db.event.update({ where: { id }, data: { status } });
    await audit({ userId: viewer.user.id, action: "event.status", entity: "Event", entityId: id, summary: `Marcou "${ev.title}" como ${status.toLowerCase()}` });
    if (status === "CANCELADO") {
      await sendWebhook(hook(), { title: `❌ Cancelado: ${ev.title}`, description: `Estava marcado para ${fmtDateTime(ev.startsAt)}.`, color: 0xf75a68 });
    }
    revalidate(id);
    return status === "CANCELADO" ? "Evento cancelado" : status === "CONCLUIDO" ? "Evento concluído" : "Evento reaberto";
  });
}

export async function deleteEvent(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const ev = await db.event.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "event.delete", entity: "Event", entityId: id, summary: `Apagou "${ev.title}" da agenda` });
    revalidate();
  });
  if (result.ok) redirectWithToast("/agenda", "apagado");
  return result;
}

export async function setAttendance(eventId: string, status: "VOU" | "TALVEZ" | "NAO_VOU") {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    if (!viewer.member) throw new Error("Você não tem ficha de membro");
    const parsed = z.enum(["VOU", "TALVEZ", "NAO_VOU"]).parse(status);
    const ev = await db.event.findUniqueOrThrow({ where: { id: eventId } });
    if (ev.status !== "AGENDADO") throw new Error("Esse evento não está mais aberto");
    await db.attendance.upsert({
      where: { eventId_memberId: { eventId, memberId: viewer.member.id } },
      create: { eventId, memberId: viewer.member.id, status: parsed },
      update: { status: parsed },
    });
    revalidate(eventId);
    return parsed === "VOU" ? "Presença confirmada" : parsed === "TALVEZ" ? "Marcado como talvez" : "Ok, você não vai";
  });
}

export async function saveLineup(eventId: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const ev = await db.event.findUniqueOrThrow({ where: { id: eventId } });
    const slots = parseLineupForm(fd);
    const memberIds = [...new Set(slots.map((s) => s.memberId).filter((m): m is string => Boolean(m)))];
    const members = await db.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, rpName: true } });
    if (members.length !== memberIds.length) throw new Error("Membro inválido na escalação");
    const names = new Map(members.map((m) => [m.id, m.rpName]));

    const unavailable = await unavailableMembers(ev.startsAt);
    const problems = lineupProblems(slots, unavailable);
    const dup = problems.find((p) => p.startsWith("duplicado:"));
    if (dup) throw new Error(`${names.get(dup.split(":")[1])} está em duas vagas`);
    const unav = problems.find((p) => p.startsWith("indisponivel:"));
    if (unav) {
      const id = unav.split(":")[1];
      throw new Error(`${names.get(id)} está ${unavailable.get(id)} nesse horário`);
    }

    await db.$transaction([
      db.lineupSlot.deleteMany({ where: { eventId } }),
      db.lineupSlot.createMany({ data: slots.map((s, i) => ({ ...s, eventId, order: i })) }),
    ]);
    await audit({
      userId: viewer.user.id,
      action: "lineup.save",
      entity: "Event",
      entityId: eventId,
      summary: `Salvou a escalação de "${ev.title}" (${memberIds.length} membros)`,
    });
    revalidate(eventId);
    return "Escalação salva";
  });
}

export async function publishLineup(eventId: string) {
  return runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const ev = await db.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { slots: { include: { member: true }, orderBy: { order: "asc" } } },
    });
    const filled = ev.slots.filter((s) => s.member);
    if (!filled.length) throw new Error("Escale pelo menos um membro antes de publicar");
    await db.event.update({ where: { id: eventId }, data: { lineupPublishedAt: new Date() } });
    const lines = ev.slots.map((s) => `**${s.role}** — ${s.member?.rpName ?? "_vaga aberta_"}${s.vehicle ? ` · 🚗 ${s.vehicle}` : ""}`);
    await sendWebhook(hook(), {
      title: `📋 Escalação: ${ev.title}`,
      description: lines.join("\n").slice(0, 3500),
      url: panelUrl(`/agenda/${ev.id}`),
      fields: [{ name: "Quando", value: `${fmtDateTime(ev.startsAt)}`, inline: true }, ...(ev.location ? [{ name: "Onde", value: ev.location, inline: true }] : [])],
    });
    await audit({ userId: viewer.user.id, action: "lineup.publish", entity: "Event", entityId: eventId, summary: `Publicou a escalação de "${ev.title}"` });
    revalidate(eventId);
    return `Escalação publicada (${filled.length} membros, ${fmtTime(ev.startsAt)})`;
  });
}

export async function saveReport(eventId: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const data = parseReportForm(fd);
    const ev = await db.event.findUniqueOrThrow({ where: { id: eventId } });
    if (ev.startsAt > new Date()) throw new Error("O relatório só pode ser feito depois que o evento começar");
    await db.$transaction([
      db.eventReport.upsert({
        where: { eventId },
        create: { ...data, eventId, authorId: viewer.member?.id },
        update: data,
      }),
      db.event.update({ where: { id: eventId }, data: { status: "CONCLUIDO" } }),
    ]);
    await audit({ userId: viewer.user.id, action: "report.save", entity: "Event", entityId: eventId, summary: `Registrou o relatório de "${ev.title}" (${data.result.toLowerCase()})` });
    revalidate(eventId);
    return "Relatório salvo — evento concluído";
  });
}
