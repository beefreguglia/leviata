"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseFarmGuideForm } from "@/lib/schemas/content";
import { existingUploadIds } from "@/lib/uploads";

async function parse(fd: FormData) {
  const data = parseFarmGuideForm(fd);
  if (data.itemId && !(await db.item.findUnique({ where: { id: data.itemId } }))) throw new Error("Item inválido");
  return { ...data, imageIds: await existingUploadIds(data.imageIds) };
}

function revalidate() {
  revalidatePath("/farm", "layout");
  revalidatePath("/fabricacao");
}

export async function createFarmGuide(fd: FormData) {
  let id = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("farm.editar");
    const guide = await db.farmGuide.create({ data: { ...(await parse(fd)), authorId: viewer.member?.id } });
    id = guide.id;
    await audit({ userId: viewer.user.id, action: "farm.create", entity: "FarmGuide", entityId: guide.id, summary: `Escreveu o guia de farm "${guide.title}"` });
    revalidate();
  });
  if (result.ok) redirectWithToast(`/farm/${id}`, "criado");
  return result;
}

export async function updateFarmGuide(id: string, fd: FormData) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("farm.editar");
    const guide = await db.farmGuide.update({ where: { id }, data: await parse(fd) });
    await audit({ userId: viewer.user.id, action: "farm.update", entity: "FarmGuide", entityId: id, summary: `Editou o guia de farm "${guide.title}"` });
    revalidate();
  });
  if (result.ok) redirectWithToast(`/farm/${id}`, "salvo");
  return result;
}

export async function deleteFarmGuide(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("farm.editar");
    const guide = await db.farmGuide.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "farm.delete", entity: "FarmGuide", entityId: id, summary: `Apagou o guia de farm "${guide.title}"`, data: { howTo: guide.howTo } });
    revalidate();
  });
  if (result.ok) redirectWithToast("/farm", "apagado");
  return result;
}
