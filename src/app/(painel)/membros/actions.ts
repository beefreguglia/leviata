"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { formToObject, runAction } from "@/lib/actions";
import { memberInputToData as toData, memberSchema } from "@/lib/schemas/member";
import { assertCanChangeContact } from "@/lib/contact-lock";

async function ensurePassportFree(passport: string | null | undefined, exceptId?: string) {
  if (!passport) return;
  const other = await db.member.findUnique({ where: { passport } });
  if (other && other.id !== exceptId) throw new Error(`Passaporte ${passport} já é de ${other.rpName}`);
}

export async function createMember(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("membros.gerenciar");
    const input = memberSchema.parse(formToObject(fd));
    const rankId = (fd.get("rankId") as string) || null;
    await ensurePassportFree(input.passport);

    const member = await db.member.create({ data: { ...toData(input), rankId } });
    if (rankId) {
      await db.promotion.create({
        data: { memberId: member.id, toRankId: rankId, byId: viewer.member?.id, reason: "Entrada na fac" },
      });
    }
    await audit({
      userId: viewer.user.id,
      action: "member.create",
      entity: "Member",
      entityId: member.id,
      summary: `Cadastrou ${member.rpName}`,
    });
    revalidatePath("/membros");
    return `${member.rpName} cadastrado`;
  });
}

export async function updateMember(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("membros.gerenciar");
    const input = memberSchema.parse(formToObject(fd));
    await ensurePassportFree(input.passport, id);

    const before = await db.member.findUniqueOrThrow({ where: { id } });
    assertCanChangeContact(viewer.isDev, before, input);
    const member = await db.member.update({ where: { id }, data: toData(input) });
    await audit({
      userId: viewer.user.id,
      action: "member.update",
      entity: "Member",
      entityId: id,
      summary: `Editou a ficha de ${member.rpName}`,
      data: before.status !== member.status ? { status: [before.status, member.status] } : undefined,
    });
    revalidatePath("/membros");
    revalidatePath(`/membros/${id}`);
    return "Ficha atualizada";
  });
}

export async function changeRank(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("membros.gerenciar");
    const toRankId = (fd.get("rankId") as string) || null;
    const reason = String(fd.get("reason") ?? "").trim() || null;

    const member = await db.member.findUniqueOrThrow({ where: { id }, include: { rank: true } });
    if (member.rankId === toRankId) throw new Error("Essa já é a patente atual");

    const toRank = toRankId ? await db.rank.findUniqueOrThrow({ where: { id: toRankId } }) : null;
    // ninguém promove alguém para uma patente acima (ou igual) da própria, exceto admin
    const myOrder = viewer.member?.rank?.order ?? Infinity;
    if (!viewer.can("admin") && toRank && toRank.order <= myOrder) {
      throw new Error("Você não pode dar uma patente igual ou acima da sua");
    }

    await db.$transaction([
      db.member.update({ where: { id }, data: { rankId: toRankId } }),
      db.promotion.create({
        data: { memberId: id, fromRankId: member.rankId, toRankId, byId: viewer.member?.id, reason },
      }),
    ]);
    await audit({
      userId: viewer.user.id,
      action: "member.rank",
      entity: "Member",
      entityId: id,
      summary: `${member.rpName}: ${member.rank?.name ?? "sem patente"} → ${toRank?.name ?? "sem patente"}`,
    });
    revalidatePath("/membros");
    revalidatePath(`/membros/${id}`);
    revalidatePath("/hierarquia");
    return "Patente alterada";
  });
}

/**
 * Setor (membros.gerenciar) e gerências (hierarquia.gerenciar, pois dão permissões).
 * Com o servidor do Discord conectado, o que estiver ligado a um cargo volta a seguir o Discord no próximo login.
 */
export async function setMemberSector(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("membros.gerenciar");
    const sectorId = (fd.get("sectorId") as string) || null;
    if (sectorId && !(await db.sector.findUnique({ where: { id: sectorId } }))) throw new Error("Setor inválido");
    const wantsManagements = fd.get("managementsField") === "1";
    const managementIds = fd.getAll("managementIds").map(String);

    const before = await db.member.findUniqueOrThrow({ where: { id }, include: { managements: true, sector: true } });
    const changedManagements =
      wantsManagements &&
      (managementIds.length !== before.managements.length || managementIds.some((m) => !before.managements.some((g) => g.id === m)));
    if (changedManagements && !viewer.can("hierarquia.gerenciar")) throw new Error("Só quem gerencia a hierarquia muda gerências");
    if (managementIds.length) {
      const found = await db.management.count({ where: { id: { in: managementIds } } });
      if (found !== managementIds.length) throw new Error("Gerência inválida");
    }

    const member = await db.member.update({
      where: { id },
      data: {
        sectorId,
        ...(changedManagements ? { managements: { set: managementIds.map((m) => ({ id: m })) } } : {}),
      },
      include: { sector: true, managements: true },
    });
    await audit({
      userId: viewer.user.id,
      action: "member.sector",
      entity: "Member",
      entityId: id,
      summary: `${member.rpName}: setor ${member.sector?.name ?? "nenhum"}${changedManagements ? ` · gerências: ${member.managements.map((g) => g.name).join(", ") || "nenhuma"}` : ""}`,
    });
    revalidatePath("/membros");
    revalidatePath(`/membros/${id}`);
    revalidatePath("/hierarquia");
    return "Setor e gerências atualizados";
  });
}
