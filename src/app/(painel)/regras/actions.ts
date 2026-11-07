"use server";

import { revalidatePath } from "next/cache";
import { redirectWithToast } from "@/lib/flash";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseRuleForm as parse, slugify } from "@/lib/schemas/rule";

export async function createRule(fd: FormData) {
  let slug = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("regras.editar");
    const data = parse(fd);
    slug = slugify(data.title);
    if (await db.rulePage.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const page = await db.rulePage.create({
      data: { ...data, slug, versions: { create: { title: data.title, content: data.content, authorId: viewer.member?.id } } },
    });
    await audit({ userId: viewer.user.id, action: "rule.create", entity: "RulePage", entityId: page.id, summary: `Criou a página de regras "${page.title}"` });
    revalidatePath("/regras", "layout");
  });
  if (result.ok) redirectWithToast(`/regras/${slug}`, "criado");
  return result;
}

export async function updateRule(id: string, fd: FormData) {
  let slug = "";
  const result = await runAction(async () => {
    const viewer = await assertPermission("regras.editar");
    const data = parse(fd);
    const page = await db.rulePage.update({
      where: { id },
      data: { ...data, versions: { create: { title: data.title, content: data.content, authorId: viewer.member?.id } } },
    });
    slug = page.slug;
    await audit({ userId: viewer.user.id, action: "rule.update", entity: "RulePage", entityId: id, summary: `Editou "${page.title}"` });
    revalidatePath("/regras", "layout");
  });
  if (result.ok) redirectWithToast(`/regras/${slug}`, "salvo");
  return result;
}

export async function deleteRule(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("regras.editar");
    const page = await db.rulePage.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "rule.delete", entity: "RulePage", entityId: id, summary: `Apagou "${page.title}"`, data: { content: page.content } });
    revalidatePath("/regras", "layout");
  });
  if (result.ok) redirectWithToast("/regras", "apagado");
  return result;
}
