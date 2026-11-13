"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parsePerimeterForm } from "@/lib/schemas/ops";
import { existingUploadIds } from "@/lib/uploads";

async function parse(fd: FormData) {
  const data = parsePerimeterForm(fd);
  const [imageId] = await existingUploadIds([data.imageId]);
  if (!imageId) throw new Error("Imagem não encontrada — envie de novo");
  return { name: data.name, imageId };
}

function revalidate() {
  revalidatePath("/perimetros", "layout");
  revalidatePath("/agenda", "layout");
}

export async function createPerimeter(fd: FormData) {
  let id = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("perimetros.gerenciar");
    const data = await parse(fd);
    const p = await db.perimeter.create({ data: { ...data, authorId: viewer.member?.id } });
    id = p.id;
    await audit({ userId: viewer.user.id, action: "perimeter.create", entity: "Perimeter", entityId: p.id, summary: `Criou o perímetro "${p.name}"` });
    revalidate();
  });
  if (result.ok) redirectWithToast(`/perimetros/${id}`, "criado");
  return result;
}

export async function updatePerimeter(id: string, fd: FormData) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("perimetros.gerenciar");
    const data = await parse(fd);
    const p = await db.perimeter.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "perimeter.update", entity: "Perimeter", entityId: id, summary: `Editou o perímetro "${p.name}"` });
    revalidate();
  });
  if (result.ok) redirectWithToast(`/perimetros/${id}`, "salvo");
  return result;
}

export async function deletePerimeter(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("perimetros.gerenciar");
    const p = await db.perimeter.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "perimeter.delete", entity: "Perimeter", entityId: id, summary: `Apagou o perímetro "${p.name}"`, data: { imageId: p.imageId } });
    revalidate();
  });
  if (result.ok) redirectWithToast("/perimetros", "apagado");
  return result;
}
