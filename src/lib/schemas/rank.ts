import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const rankSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  order: z.coerce.number().int().min(1, "Ordem deve ser 1 ou mais"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  discordRoleId: z
    .string()
    .trim()
    .regex(/^\d*$/, "ID do cargo deve ter só números")
    .transform((v) => v || null),
});

/** Lê o formulário de patente; permissões desconhecidas são descartadas. */
export function parseRankForm(fd: FormData) {
  const data = rankSchema.parse({
    name: fd.get("name"),
    order: fd.get("order"),
    color: fd.get("color"),
    discordRoleId: fd.get("discordRoleId") ?? "",
  });
  const permissions = fd
    .getAll("permissions")
    .map(String)
    .filter((p) => (ALL_PERMISSIONS as string[]).includes(p));
  return { ...data, permissions: [...new Set(permissions)] };
}
