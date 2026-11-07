"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { endOfDayBRT, fmtDate, startOfDayBRT } from "@/lib/dates";
import { sendWebhook } from "@/lib/discord";
import { parseAbsenceForm } from "@/lib/schemas/absence";

function revalidate() {
  revalidatePath("/ausencias");
  revalidatePath("/dashboard");
  revalidatePath("/membros", "layout");
  revalidatePath("/hierarquia");
}

export async function createAbsence(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    if (!viewer.member) throw new Error("Você não tem ficha de membro");
    const input = parseAbsenceForm(fd);
    const startsAt = startOfDayBRT(input.startsAt);
    const endsAt = endOfDayBRT(input.endsAt);
    if (endsAt < new Date()) throw new Error("Essa data já passou");

    // compara só com o que ainda não terminou (quem usou "Voltei" hoje pode avisar outra ausência hoje)
    const now = new Date();
    const overlap = await db.absence.findFirst({
      where: {
        memberId: viewer.member.id,
        status: { in: ["PENDENTE", "APROVADA"] },
        startsAt: { lte: endsAt },
        endsAt: { gte: startsAt > now ? startsAt : now },
      },
    });
    if (overlap) throw new Error("Você já tem uma ausência nesse período");

    // quem pode aprovar já sai com o aviso aprovado
    const autoApprove = viewer.can("ausencias.gerenciar");
    const absence = await db.absence.create({
      data: {
        memberId: viewer.member.id,
        startsAt,
        endsAt,
        reason: input.reason,
        status: autoApprove ? "APROVADA" : "PENDENTE",
        reviewerId: autoApprove ? viewer.member.id : null,
        reviewedAt: autoApprove ? new Date() : null,
      },
    });
    await audit({
      userId: viewer.user.id,
      action: "absence.create",
      entity: "Absence",
      entityId: absence.id,
      summary: `${viewer.member.rpName} avisou ausência de ${fmtDate(startsAt)} a ${fmtDate(endsAt)}`,
    });
    await sendWebhook(process.env.DISCORD_WEBHOOK_AVISOS, {
      title: "Aviso de ausência",
      description: `**${viewer.member.rpName}** vai estar fora.`,
      color: 0xff9f0a,
      fields: [
        { name: "Período", value: `${fmtDate(startsAt)} até ${fmtDate(endsAt)}`, inline: true },
        { name: "Status", value: autoApprove ? "Aprovada" : "Aguardando aprovação", inline: true },
        { name: "Motivo", value: input.reason },
      ],
    });
    revalidate();
    return autoApprove ? "Ausência registrada" : "Aviso enviado para a liderança";
  });
}

export async function reviewAbsence(id: string, approve: boolean) {
  return runAction(async () => {
    const viewer = await assertPermission("ausencias.gerenciar");
    const absence = await db.absence.update({
      where: { id },
      data: { status: approve ? "APROVADA" : "RECUSADA", reviewerId: viewer.member?.id, reviewedAt: new Date() },
      include: { member: true },
    });
    await audit({
      userId: viewer.user.id,
      action: approve ? "absence.approve" : "absence.reject",
      entity: "Absence",
      entityId: id,
      summary: `${approve ? "Aprovou" : "Recusou"} a ausência de ${absence.member.rpName}`,
    });
    revalidate();
    return approve ? "Ausência aprovada" : "Ausência recusada";
  });
}

export async function cancelAbsence(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    const absence = await db.absence.findUniqueOrThrow({ where: { id }, include: { member: true } });
    const own = absence.memberId === viewer.member?.id;
    if (!own && !viewer.can("ausencias.gerenciar")) throw new Error("Sem permissão");

    // se já começou, encerra hoje em vez de cancelar
    const now = new Date();
    const started = absence.startsAt <= now;
    await db.absence.update({
      where: { id },
      data: started ? { endsAt: now } : { status: "CANCELADA" },
    });
    await audit({
      userId: viewer.user.id,
      action: "absence.cancel",
      entity: "Absence",
      entityId: id,
      summary: started ? `${absence.member.rpName} voltou antes` : `Cancelou a ausência de ${absence.member.rpName}`,
    });
    revalidate();
    return started ? "Bem-vindo de volta!" : "Ausência cancelada";
  });
}
