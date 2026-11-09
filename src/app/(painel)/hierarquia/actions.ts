"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseManagementForm, parseRankForm as parse, parseSectorForm } from "@/lib/schemas/rank";

function revalidate() {
  revalidatePath("/hierarquia");
  revalidatePath("/membros");
}

export async function createRank(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parse(fd);
    const taken = await db.rank.findUnique({ where: { order: data.order } });
    if (taken) {
      // empurra todo mundo de ordem >= para baixo, de trás pra frente (ordem é única)
      const below = await db.rank.findMany({ where: { order: { gte: data.order } }, orderBy: { order: "desc" } });
      for (const r of below) await db.rank.update({ where: { id: r.id }, data: { order: r.order + 1 } });
    }
    const rank = await db.rank.create({ data });
    await audit({ userId: viewer.user.id, action: "rank.create", entity: "Rank", entityId: rank.id, summary: `Criou a patente ${rank.name}` });
    revalidate();
    return `Patente ${rank.name} criada`;
  });
}

export async function updateRank(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parse(fd);
    const current = await db.rank.findUniqueOrThrow({ where: { id } });

    // evita alguém tirar o próprio admin sem querer
    if (viewer.member?.rankId === id && current.permissions.includes("admin") && !data.permissions.includes("admin")) {
      throw new Error("Você não pode remover o admin da sua própria patente");
    }

    await db.$transaction(async (tx) => {
      if (data.order !== current.order) {
        const other = await tx.rank.findUnique({ where: { order: data.order } });
        if (other) {
          // troca de posição com a patente que ocupava a ordem
          await tx.rank.update({ where: { id }, data: { order: -1 } });
          await tx.rank.update({ where: { id: other.id }, data: { order: current.order } });
        }
      }
      await tx.rank.update({ where: { id }, data });
    });

    await audit({
      userId: viewer.user.id,
      action: "rank.update",
      entity: "Rank",
      entityId: id,
      summary: `Editou a patente ${data.name}`,
      data: { permissions: data.permissions },
    });
    revalidate();
    return "Patente atualizada";
  });
}

export async function deleteRank(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const rank = await db.rank.findUniqueOrThrow({ where: { id }, include: { _count: { select: { members: true } } } });
    if (rank._count.members > 0) throw new Error(`Mova os ${rank._count.members} membros desta patente antes de apagar`);
    await db.rank.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "rank.delete", entity: "Rank", entityId: id, summary: `Apagou a patente ${rank.name}` });
    revalidate();
    return "Patente apagada";
  });
}

/** Cargo do Discord usado em outro setor/gerência/patente dá conflito confuso: avisa antes. */
async function assertRoleFree(kind: "sector" | "management", roleId: string | null, exceptId?: string) {
  if (!roleId) return;
  const other = kind === "sector" ? await db.sector.findUnique({ where: { discordRoleId: roleId } }) : await db.management.findUnique({ where: { discordRoleId: roleId } });
  if (other && other.id !== exceptId) throw new Error(`O cargo ${roleId} já está ligado a ${other.name}`);
}

// ---------------- Setores ----------------

export async function createSector(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parseSectorForm(fd);
    await assertRoleFree("sector", data.discordRoleId);
    const sector = await db.sector.create({ data });
    await audit({ userId: viewer.user.id, action: "sector.create", entity: "Sector", entityId: sector.id, summary: `Criou o setor ${sector.name}` });
    revalidate();
    return `Setor ${sector.name} criado`;
  });
}

export async function updateSector(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parseSectorForm(fd);
    await assertRoleFree("sector", data.discordRoleId, id);
    const sector = await db.sector.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "sector.update", entity: "Sector", entityId: id, summary: `Editou o setor ${sector.name}`, data: { permissions: data.permissions } });
    revalidate();
    return "Setor atualizado";
  });
}

export async function deleteSector(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const sector = await db.sector.findUniqueOrThrow({ where: { id }, include: { _count: { select: { members: true } } } });
    if (sector._count.members > 0) throw new Error(`Tire os ${sector._count.members} membros deste setor antes de apagar`);
    await db.sector.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "sector.delete", entity: "Sector", entityId: id, summary: `Apagou o setor ${sector.name}` });
    revalidate();
    return "Setor apagado";
  });
}

// ---------------- Gerências ----------------

export async function createManagement(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parseManagementForm(fd);
    await assertRoleFree("management", data.discordRoleId);
    const g = await db.management.create({ data });
    await audit({ userId: viewer.user.id, action: "management.create", entity: "Management", entityId: g.id, summary: `Criou a gerência ${g.name}` });
    revalidate();
    return `Gerência ${g.name} criada`;
  });
}

export async function updateManagement(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const data = parseManagementForm(fd);
    await assertRoleFree("management", data.discordRoleId, id);
    const g = await db.management.update({ where: { id }, data });
    await audit({
      userId: viewer.user.id,
      action: "management.update",
      entity: "Management",
      entityId: id,
      summary: `Editou a gerência ${g.name}`,
      data: { permissions: data.permissions },
    });
    revalidate();
    return "Gerência atualizada";
  });
}

export async function deleteManagement(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("hierarquia.gerenciar");
    const g = await db.management.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "management.delete", entity: "Management", entityId: id, summary: `Apagou a gerência ${g.name}` });
    revalidate();
    return "Gerência apagada";
  });
}
