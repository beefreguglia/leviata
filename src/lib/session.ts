import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";

/** Usuário logado + ficha de membro + permissões (lidas do banco a cada request). */
export const getViewer = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: { include: { rank: true } } },
  });
  if (!user) return null;

  const member = user.member;
  const blocked = !member || member.status === "EXPULSO";
  const permissions: string[] = blocked ? [] : (member.rank?.permissions ?? []);

  return {
    user,
    member,
    permissions,
    can: (perm: Permission) => hasPermission(permissions, perm),
  };
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/** Para páginas: redireciona se não logado ou sem permissão. */
export async function requireViewer(perm: Permission = "painel.ver") {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.can(perm)) redirect("/sem-acesso");
  return viewer;
}

/** Para Server Actions: lança erro se não tiver permissão. */
export async function assertPermission(perm: Permission) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  if (!viewer.can(perm)) throw new Error("Sem permissão para esta ação");
  return viewer;
}
