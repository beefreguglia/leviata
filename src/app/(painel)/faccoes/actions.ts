"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { FACTION_RELATION } from "@/lib/labels";
import { parseFactionEventForm, parseFactionForm } from "@/lib/schemas/content";
import { existingUploadIds } from "@/lib/uploads";

async function parse(fd: FormData) {
  const data = parseFactionForm(fd);
  const [logoId] = data.logoId ? await existingUploadIds([data.logoId]) : [];
  return { ...data, logoId: logoId ?? null };
}

async function ensureNameFree(name: string, exceptId?: string) {
  const other = await db.faction.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (other && other.id !== exceptId) throw new Error(`Já existe a facção ${other.name}`);
}

function revalidate(id?: string) {
  revalidatePath("/faccoes");
  if (id) revalidatePath(`/faccoes/${id}`);
}

export async function createFaction(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = await parse(fd);
    await ensureNameFree(data.name);
    const faction = await db.faction.create({ data });
    await audit({ userId: viewer.user.id, action: "faction.create", entity: "Faction", entityId: faction.id, summary: `Cadastrou a facção ${faction.name}` });
    revalidate();
    return `${faction.name} cadastrada`;
  });
}

export async function updateFaction(id: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = await parse(fd);
    await ensureNameFree(data.name, id);
    const before = await db.faction.findUniqueOrThrow({ where: { id } });

    await db.$transaction(async (tx) => {
      await tx.faction.update({ where: { id }, data });
      if (before.relation !== data.relation) {
        await tx.factionEvent.create({
          data: {
            factionId: id,
            kind: "RELACAO",
            title: `Relação: ${FACTION_RELATION[before.relation].label} → ${FACTION_RELATION[data.relation].label}`,
            authorId: viewer.member?.id,
          },
        });
      }
    });
    await audit({
      userId: viewer.user.id,
      action: "faction.update",
      entity: "Faction",
      entityId: id,
      summary: `Editou a facção ${data.name}`,
      data: before.relation !== data.relation ? { relation: [before.relation, data.relation] } : undefined,
    });
    revalidate(id);
    return "Facção atualizada";
  });
}

export async function deleteFaction(id: string) {
  const result = await runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const faction = await db.faction.delete({ where: { id } });
    await audit({ userId: viewer.user.id, action: "faction.delete", entity: "Faction", entityId: id, summary: `Apagou a facção ${faction.name}` });
    revalidate();
  });
  if (result.ok) redirect("/faccoes");
  return result;
}

export async function addFactionEvent(factionId: string, fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const data = parseFactionEventForm(fd);
    const event = await db.factionEvent.create({
      data: { ...data, happenedAt: data.happenedAt ?? new Date(), factionId, authorId: viewer.member?.id },
      include: { faction: true },
    });
    await audit({ userId: viewer.user.id, action: "faction.event", entity: "Faction", entityId: factionId, summary: `${event.faction.name}: ${event.title}` });
    revalidate(factionId);
    return "Registrado no histórico";
  });
}

export async function deleteFactionEvent(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("conteudo.editar");
    const event = await db.factionEvent.delete({ where: { id }, include: { faction: true } });
    await audit({ userId: viewer.user.id, action: "faction.event.delete", entity: "Faction", entityId: event.factionId, summary: `Removeu do histórico de ${event.faction.name}: ${event.title}` });
    revalidate(event.factionId);
    return "Removido do histórico";
  });
}
