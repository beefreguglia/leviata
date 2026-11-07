"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { audit } from "@/lib/audit";
import { runAction } from "@/lib/actions";
import { parseRegistrationForm } from "@/lib/schemas/member";

/** O próprio membro preenche nome, número e ID (qualquer patente, até sem patente). */
export async function saveMyRegistration(fd: FormData) {
  return runAction(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new Error("Não autenticado");
    const member = viewer.member;
    if (!member || member.status === "EXPULSO") throw new Error("Sem permissão para esta ação");

    const input = parseRegistrationForm(fd);
    const other = await db.member.findUnique({ where: { passport: input.passport } });
    if (other && other.id !== member.id) throw new Error(`O ID ${input.passport} já está na ficha de ${other.rpName} — fale com a liderança`);

    const first = !member.passport;
    await db.member.update({ where: { id: member.id }, data: input });
    await audit({
      userId: viewer.user.id,
      action: "member.register",
      entity: "Member",
      entityId: member.id,
      summary: `${first ? "Fez" : "Atualizou"} o registro: ${input.rpName} · ID ${input.passport} · ${input.phone}`,
    });
    revalidatePath("/", "layout");
    return first ? "Registro feito — bem-vindo à Leviatã" : "Registro atualizado";
  });
}
