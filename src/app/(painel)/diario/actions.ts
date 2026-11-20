"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { fmtDateTime } from "@/lib/dates";
import { parseDiaryForm } from "@/lib/schemas/content";

function revalidate() {
  revalidatePath("/diario");
}

async function parse(fd: FormData) {
  const data = parseDiaryForm(fd);
  if (data.happenedAt.getTime() > Date.now() + 5 * 60_000) throw new Error("O diário é do que já aconteceu: a data não pode ser no futuro");
  if (data.factionId && !(await db.faction.findUnique({ where: { id: data.factionId }, select: { id: true } }))) throw new Error("Facção não encontrada");
  return data;
}

export async function createDiaryEntry(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("diario.criar");
    const data = await parse(fd);
    const entry = await db.diaryEntry.create({ data: { ...data, authorId: viewer.member?.id } });
    await audit({
      userId: viewer.user.id,
      action: "diary.create",
      entity: "DiaryEntry",
      entityId: entry.id,
      summary: `Registrou no diário "${entry.title}" (${fmtDateTime(entry.happenedAt)})`,
    });
    revalidate();
    return "Registrado no diário";
  });
}

/** O autor mexe no próprio registro com `diario.criar`; nos dos outros precisa de `diario.editar`/`diario.apagar`. */
async function loadForChange(id: string, otherPerm: "diario.editar" | "diario.apagar") {
  const viewer = await assertPermission("diario.ver");
  const entry = await db.diaryEntry.findUniqueOrThrow({ where: { id } });
  const own = entry.authorId != null && entry.authorId === viewer.member?.id;
  if (own ? !viewer.can("diario.criar") : !viewer.can(otherPerm)) throw new Error("Sem permissão");
  return { viewer, entry };
}

export async function updateDiaryEntry(id: string, fd: FormData) {
  return runAction(async () => {
    const { viewer } = await loadForChange(id, "diario.editar");
    const data = await parse(fd);
    const entry = await db.diaryEntry.update({ where: { id }, data });
    await audit({ userId: viewer.user.id, action: "diary.update", entity: "DiaryEntry", entityId: id, summary: `Editou no diário "${entry.title}"` });
    revalidate();
    return "Registro atualizado";
  });
}

export async function deleteDiaryEntry(id: string) {
  return runAction(async () => {
    const { viewer, entry } = await loadForChange(id, "diario.apagar");
    await db.diaryEntry.delete({ where: { id } });
    await audit({
      userId: viewer.user.id,
      action: "diary.delete",
      entity: "DiaryEntry",
      entityId: id,
      summary: `Apagou do diário "${entry.title}"`,
      data: { content: entry.content, happenedAt: entry.happenedAt },
    });
    revalidate();
    return "Registro apagado";
  });
}
