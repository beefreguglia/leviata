"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseDossierForm, parseDossierLinkForm, parseVehicleForm } from "@/lib/schemas/dossier";
import { existingUploadIds } from "@/lib/uploads";

const PERM = "dossie.editar";

async function parse(fd: FormData) {
  const data = parseDossierForm(fd);
  if (data.factionId && !(await db.faction.findUnique({ where: { id: data.factionId } }))) throw new Error("Facção não encontrada");
  return { ...data, imageIds: await existingUploadIds(data.imageIds) };
}

function revalidate(id?: string) {
  revalidatePath("/dossie");
  if (id) revalidatePath(`/dossie/${id}`);
}

export async function createDossier(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const data = await parse(fd);
    const dossier = await db.dossier.create({ data: { ...data, authorId: viewer.member?.id ?? null } });
    await audit({ userId: viewer.user.id, action: "dossier.create", entity: "Dossier", entityId: dossier.id, summary: `Criou a ficha de ${dossier.name}` });
    revalidate();
    return `Ficha de ${dossier.name} criada`;
  });
}

export async function updateDossier(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const data = await parse(fd);
    const dossier = await db.dossier.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "dossier.update", entity: "Dossier", entityId: id, summary: `Editou a ficha de ${dossier.name}` });
    revalidate(id);
    return "Ficha atualizada";
  });
}

export async function deleteDossier(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission(PERM);
    const dossier = await db.dossier.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "dossier.delete", entity: "Dossier", entityId: id, summary: `Apagou a ficha de ${dossier.name}` });
    revalidate();
  });
  if (result.ok) redirectWithToast("/dossie", "apagado");
  return result;
}

export async function addVehicle(dossierId: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const data = parseVehicleForm(fd);
    const vehicle = await db.dossierVehicle.create({ data: { ...data, dossierId }, include: { dossier: true } });
    await audit({ userId: viewer.user.id, action: "dossier.vehicle.add", entity: "Dossier", entityId: dossierId, summary: `Adicionou a placa ${vehicle.plate} à ficha de ${vehicle.dossier.name}` });
    revalidate(dossierId);
    return `Placa ${vehicle.plate} adicionada`;
  });
}

export async function removeVehicle(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const vehicle = await db.dossierVehicle.delete({ where: { id }, include: { dossier: true } });
    await audit({ userId: viewer.user.id, action: "dossier.vehicle.remove", entity: "Dossier", entityId: vehicle.dossierId, summary: `Removeu a placa ${vehicle.plate} da ficha de ${vehicle.dossier.name}` });
    revalidate(vehicle.dossierId);
    return "Placa removida";
  });
}

export async function addDossierLink(fromId: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const data = parseDossierLinkForm(fd);
    if (data.toId === fromId) throw new Error("Uma ficha não pode ter vínculo com ela mesma");
    const existing = await db.dossierLink.findFirst({ where: { OR: [{ fromId, toId: data.toId }, { fromId: data.toId, toId: fromId }] } });
    if (existing) throw new Error("Essas fichas já têm um vínculo");
    const link = await db.dossierLink.create({ data: { ...data, fromId }, include: { from: true, to: true } });
    await audit({ userId: viewer.user.id, action: "dossier.link.add", entity: "Dossier", entityId: fromId, summary: `Ligou ${link.from.name} a ${link.to.name}: ${link.description}` });
    revalidate(fromId);
    revalidate(data.toId);
    return "Vínculo adicionado";
  });
}

export async function removeDossierLink(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission(PERM);
    const link = await db.dossierLink.delete({ where: { id }, include: { from: true, to: true } });
    await audit({ userId: viewer.user.id, action: "dossier.link.remove", entity: "Dossier", entityId: link.fromId, summary: `Removeu o vínculo entre ${link.from.name} e ${link.to.name}` });
    revalidate(link.fromId);
    revalidate(link.toId);
    return "Vínculo removido";
  });
}
