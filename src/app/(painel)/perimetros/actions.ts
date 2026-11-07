"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parsePerimeterForm } from "@/lib/schemas/ops";
import { existingUploadIds } from "@/lib/uploads";

async function parse(fd: FormData) {
  const { roles, ...data } = parsePerimeterForm(fd);
  if (data.pinId && !(await db.mapPin.findUnique({ where: { id: data.pinId } }))) throw new Error("Lugar do mapa inválido");
  return {
    data: { ...data, imageIds: await existingUploadIds(data.imageIds) },
    roles: roles.map((r, i) => ({ ...r, order: i })),
  };
}

function revalidate() {
  revalidatePath("/perimetros", "layout");
  revalidatePath("/mapa");
  revalidatePath("/agenda", "layout");
}

export async function createPerimeter(fd: FormData) {
  let id = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const { data, roles } = await parse(fd);
    const p = await db.perimeter.create({ data: { ...data, authorId: viewer.member?.id, roles: { create: roles } } });
    id = p.id;
    await audit({ userId: viewer.user.id, action: "perimeter.create", entity: "Perimeter", entityId: p.id, summary: `Criou o perímetro "${p.name}"` });
    revalidate();
  });
  if (result.ok) redirect(`/perimetros/${id}`);
  return result;
}

export async function updatePerimeter(id: string, fd: FormData) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const { data, roles } = await parse(fd);
    const p = await db.$transaction(async (tx) => {
      await tx.perimeterRole.deleteMany({ where: { perimeterId: id } });
      return tx.perimeter.update({ where: { id }, data: { ...data, roles: { create: roles } } });
    });
    await audit({ userId: viewer.user.id, action: "perimeter.update", entity: "Perimeter", entityId: id, summary: `Editou o perímetro "${p.name}"` });
    revalidate();
  });
  if (result.ok) redirect(`/perimetros/${id}`);
  return result;
}

export async function deletePerimeter(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("operacoes.gerenciar");
    const p = await db.perimeter.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "perimeter.delete", entity: "Perimeter", entityId: id, summary: `Apagou o perímetro "${p.name}"`, data: { plan: p.plan } });
    revalidate();
  });
  if (result.ok) redirect("/perimetros");
  return result;
}
