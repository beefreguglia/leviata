"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { slugify } from "@/lib/schemas/rule";
import { parseLoreForm } from "@/lib/schemas/content";
import { existingUploadIds } from "@/lib/uploads";

async function uniqueSlug(title: string, exceptId?: string) {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const other = await db.loreArticle.findUnique({ where: { slug }, select: { id: true } });
    if (!other || other.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
}

async function parse(fd: FormData) {
  const data = parseLoreForm(fd);
  const [coverId] = data.coverId ? await existingUploadIds([data.coverId]) : [];
  return { ...data, coverId: coverId ?? null };
}

export async function createLore(fd: FormData) {
  let slug = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = await parse(fd);
    slug = await uniqueSlug(data.title);
    const article = await db.loreArticle.create({ data: { ...data, slug, authorId: viewer.member?.id } });
    await audit({ userId: viewer.user.id, action: "lore.create", entity: "LoreArticle", entityId: article.id, summary: `Escreveu "${article.title}" na lore` });
    revalidatePath("/lore", "layout");
  });
  if (result.ok) redirectWithToast(`/lore/${slug}`, "criado");
  return result;
}

export async function updateLore(id: string, fd: FormData) {
  let slug = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = await parse(fd);
    slug = await uniqueSlug(data.title, id);
    const article = await db.loreArticle.update({ where: { id }, data: { ...data, slug } });
    await audit({ userId: viewer.user.id, action: "lore.update", entity: "LoreArticle", entityId: id, summary: `Editou "${article.title}" na lore` });
    revalidatePath("/lore", "layout");
  });
  if (result.ok) redirectWithToast(`/lore/${slug}`, "salvo");
  return result;
}

export async function deleteLore(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const article = await db.loreArticle.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "lore.delete", entity: "LoreArticle", entityId: id, summary: `Apagou "${article.title}" da lore`, data: { content: article.content } });
    revalidatePath("/lore", "layout");
  });
  if (result.ok) redirectWithToast("/lore", "apagado");
  return result;
}
