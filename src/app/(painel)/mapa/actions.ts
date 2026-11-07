"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { getMapConfig } from "@/lib/map-config";
import { assertInsideMap, mapConfigSchema, parsePinForm } from "@/lib/schemas/ops";
import { existingUploadIds } from "@/lib/uploads";

function revalidate() {
  revalidatePath("/mapa");
  revalidatePath("/perimetros", "layout");
}

export async function saveMapConfig(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = mapConfigSchema.parse({ imageId: fd.get("imageId"), width: fd.get("width"), height: fd.get("height") });
    const [imageId] = await existingUploadIds([data.imageId]);
    if (!imageId) throw new Error("Envie a imagem do mapa");
    const value = { ...data, imageId };
    await db.setting.upsert({ where: { key: "mapa" }, create: { key: "mapa", value }, update: { value } });
    await audit({ userId: viewer.user.id, action: "map.config", entity: "Setting", entityId: "mapa", summary: `Trocou a imagem do mapa (${data.width}×${data.height})` });
    revalidate();
    return "Mapa atualizado";
  });
}

async function parse(fd: FormData) {
  const map = await getMapConfig();
  if (!map) throw new Error("Configure a imagem do mapa primeiro");
  const data = parsePinForm(fd);
  assertInsideMap(data.x, data.y, map);
  if (data.farmGuideId && !(await db.farmGuide.findUnique({ where: { id: data.farmGuideId } }))) throw new Error("Guia de farm inválido");
  if (data.factionId && !(await db.faction.findUnique({ where: { id: data.factionId } }))) throw new Error("Facção inválida");
  return { ...data, imageIds: await existingUploadIds(data.imageIds) };
}

export async function createPin(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const pin = await db.mapPin.create({ data: { ...(await parse(fd)), authorId: viewer.member?.id } });
    await audit({ userId: viewer.user.id, action: "pin.create", entity: "MapPin", entityId: pin.id, summary: `Marcou "${pin.title}" no mapa` });
    revalidate();
    return `"${pin.title}" marcado no mapa`;
  });
}

export async function updatePin(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const pin = await db.mapPin.update({ where: { id }, data: await parse(fd) });
    await audit({ userId: viewer.user.id, action: "pin.update", entity: "MapPin", entityId: id, summary: `Editou "${pin.title}" no mapa` });
    revalidate();
    return "Marcador atualizado";
  });
}

export async function deletePin(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const pin = await db.mapPin.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "pin.delete", entity: "MapPin", entityId: id, summary: `Removeu "${pin.title}" do mapa` });
    revalidate();
    return "Marcador removido";
  });
}
