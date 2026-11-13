"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { STREAM_PLATFORM } from "@/lib/labels";
import { STREAM_PLATFORMS, normalizeStreamHandle } from "@/lib/schemas/content";
import { refreshStreams } from "@/lib/stream-refresh";

const MAX_CHANNELS_PER_MEMBER = 3;

function revalidate() {
  revalidatePath("/lives");
  revalidatePath("/dashboard");
}

export async function addStreamChannel(fd: FormData) {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    if (!viewer.member) throw new Error("Você não tem ficha de membro");
    const platform = z.enum(STREAM_PLATFORMS, { error: "Escolha a plataforma" }).parse(fd.get("platform"));
    const handle = normalizeStreamHandle(platform, String(fd.get("handle") ?? ""));
    if (!handle) {
      throw new Error(platform === "YOUTUBE" ? "Use o link com o ID do canal (youtube.com/channel/UC…)" : "Canal inválido — confira o link ou o nome");
    }
    const taken = await db.streamChannel.findUnique({ where: { platform_handle: { platform, handle } }, include: { member: true } });
    if (taken) throw new Error(taken.memberId === viewer.member.id ? "Você já cadastrou esse canal" : `Esse canal já é de ${taken.member.rpName}`);
    const count = await db.streamChannel.count({ where: { memberId: viewer.member.id } });
    if (count >= MAX_CHANNELS_PER_MEMBER) throw new Error(`Máximo de ${MAX_CHANNELS_PER_MEMBER} canais por membro`);

    const channel = await db.streamChannel.create({ data: { platform, handle, memberId: viewer.member.id } });
    await audit({
      userId: viewer.user.id,
      action: "stream.add",
      entity: "StreamChannel",
      entityId: channel.id,
      summary: `Cadastrou o canal ${STREAM_PLATFORM[platform].label}/${handle}`,
    });
    revalidate();
    return "Canal cadastrado — o status aparece na próxima verificação";
  });
}

export async function removeStreamChannel(id: string) {
  return runAction(async () => {
    const viewer = await assertPermission("painel.ver");
    const channel = await db.streamChannel.findUniqueOrThrow({ where: { id }, include: { member: true } });
    if (channel.memberId !== viewer.member?.id && !viewer.can("lives.gerenciar")) throw new Error("Sem permissão");
    await db.streamChannel.delete({ where: { id } });
    await audit({
      userId: viewer.user.id,
      action: "stream.remove",
      entity: "StreamChannel",
      entityId: id,
      summary: `Removeu o canal ${STREAM_PLATFORM[channel.platform].label}/${channel.handle} de ${channel.member.rpName}`,
    });
    revalidate();
    return "Canal removido";
  });
}

export async function refreshStreamsNow() {
  return runAction(async () => {
    await assertPermission("lives.gerenciar");
    const s = await refreshStreams();
    revalidate();
    return `Verificados ${s.checked} canais · ${s.live} ao vivo${s.errors ? ` · ${s.errors} com erro` : ""}`;
  });
}
