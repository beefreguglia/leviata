"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { money } from "@/lib/finance";
import { PUNISHMENT_KIND } from "@/lib/labels";
import { activePunishmentWhere, WARNING_DAYS } from "@/lib/punishments";
import { WARNING_LIMIT, parsePunishmentForm } from "@/lib/schemas/finance";

function revalidate(memberId?: string) {
  revalidatePath("/punicoes");
  revalidatePath("/membros", "layout");
  if (memberId) revalidatePath(`/membros/${memberId}`);
  revalidatePath("/hierarquia");
}

export async function createPunishment(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("punicoes.aplicar");
    const data = parsePunishmentForm(fd);
    const target = await db.member.findUniqueOrThrow({ where: { id: data.memberId }, include: { rank: true } });

    // hierarquia: só pune quem está abaixo (admin pode tudo); ninguém pune a si mesmo
    if (target.id === viewer.member?.id) throw new Error("Você não pode punir a si mesmo");
    const myOrder = viewer.member?.rank?.order ?? Infinity;
    const theirOrder = target.rank?.order ?? Infinity;
    if (!viewer.can("admin") && theirOrder <= myOrder) throw new Error("Você só pode punir membros de patente abaixo da sua");

    const now = new Date();
    const days = data.days ?? (data.kind === "ADVERTENCIA" ? WARNING_DAYS : null);
    const expiresAt = days ? new Date(now.getTime() + days * 86400_000) : null;

    let toRankName: string | null = null;
    await db.$transaction(async (tx) => {
      await tx.punishment.create({
        data: {
          memberId: target.id,
          kind: data.kind,
          reason: data.reason,
          fineAmount: data.kind === "MULTA" ? data.fineAmount : null,
          expiresAt: data.kind === "EXPULSAO" || data.kind === "REBAIXAMENTO" ? null : expiresAt,
          status: data.kind === "REBAIXAMENTO" ? "CUMPRIDA" : "ATIVA",
          closedAt: data.kind === "REBAIXAMENTO" ? now : null,
          createdById: viewer.member?.id,
        },
      });
      if (data.kind === "REBAIXAMENTO") {
        const toRank = await tx.rank.findUniqueOrThrow({ where: { id: data.toRankId! } });
        if (target.rank && toRank.order <= target.rank.order) throw new Error("Rebaixamento precisa ser para uma patente abaixo da atual");
        toRankName = toRank.name;
        await tx.member.update({ where: { id: target.id }, data: { rankId: toRank.id } });
        await tx.promotion.create({
          data: { memberId: target.id, fromRankId: target.rankId, toRankId: toRank.id, byId: viewer.member?.id, reason: `Punição: ${data.reason}` },
        });
      }
      if (data.kind === "EXPULSAO") await tx.member.update({ where: { id: target.id }, data: { status: "EXPULSO", leftAt: now, leftReason: data.reason } });
    });

    const warnings = await db.punishment.count({ where: { memberId: target.id, kind: "ADVERTENCIA", ...activePunishmentWhere(now) } });
    const what =
      data.kind === "MULTA" ? `multa de ${money(data.fineAmount!)}` : data.kind === "REBAIXAMENTO" ? `rebaixamento para ${toRankName}` : PUNISHMENT_KIND[data.kind].label.toLowerCase();
    await audit({
      userId: viewer.user.id,
      action: "punishment.create",
      entity: "Member",
      entityId: target.id,
      summary: `${target.rpName}: ${what} — ${data.reason}`,
    });
    revalidate(target.id);
    if (data.kind === "ADVERTENCIA" && warnings >= WARNING_LIMIT) {
      return `Advertência aplicada — ${target.rpName} chegou a ${warnings} advertências ativas`;
    }
    return "Punição aplicada";
  });
}

/** Marca como cumprida (ex.: multa paga, suspensão encerrada antes). */
export async function completePunishment(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("punicoes.revogar");
    const p = await db.punishment.findUniqueOrThrow({ where: { id }, include: { member: true } });
    if (p.status !== "ATIVA") throw new Error("Essa punição já foi encerrada");
    await db.punishment.update({ where: { id }, data: { status: "CUMPRIDA", closedAt: new Date() } });
    await audit({ userId: viewer.user.id, action: "punishment.complete", entity: "Member", entityId: p.memberId, summary: `${p.member.rpName}: ${PUNISHMENT_KIND[p.kind].label.toLowerCase()} cumprida` });
    revalidate(p.memberId);
    return "Marcada como cumprida";
  });
}

/** Revoga (anula). Revogar uma expulsão devolve o membro como ativo. */
export async function revokePunishment(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("punicoes.revogar");
    const reason = z.string().trim().min(3, "Explique por que está revogando").parse(fd.get("revokeReason"));
    const p = await db.punishment.findUniqueOrThrow({ where: { id }, include: { member: true } });
    if (p.status === "REVOGADA") throw new Error("Já estava revogada");
    await db.$transaction([
      db.punishment.update({ where: { id }, data: { status: "REVOGADA", revokeReason: reason, closedAt: new Date() } }),
      ...(p.kind === "EXPULSAO" && p.member.status === "EXPULSO" ? [db.member.update({ where: { id: p.memberId }, data: { status: "ATIVO", leftAt: null, leftReason: null } })] : []),
    ]);
    await audit({
      userId: viewer.user.id,
      action: "punishment.revoke",
      entity: "Member",
      entityId: p.memberId,
      summary: `Revogou ${PUNISHMENT_KIND[p.kind].label.toLowerCase()} de ${p.member.rpName}: ${reason}`,
    });
    revalidate(p.memberId);
    return p.kind === "EXPULSAO" ? `${p.member.rpName} voltou para a fac` : "Punição revogada";
  });
}
