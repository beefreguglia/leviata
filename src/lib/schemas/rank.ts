import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/permissions";

/** Lê as permissões marcadas; as desconhecidas são descartadas. */
function parsePermissions(fd: FormData) {
  const permissions = fd
    .getAll("permissions")
    .map(String)
    .filter((p) => (ALL_PERMISSIONS as string[]).includes(p));
  return [...new Set(permissions)];
}

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
  return { ...data, permissions: parsePermissions(fd) };
}

const roleId = z
  .string()
  .trim()
  .regex(/^\d*$/, "ID do cargo deve ter só números")
  .transform((v) => v || null);

/** Setor: nome, o que faz, cor, ordem e cargo do Discord. */
export function parseSectorForm(fd: FormData) {
  const data = z
    .object({
      name: z.string().trim().min(2, "Nome muito curto").max(40),
      description: z
        .string()
        .trim()
        .max(60)
        .transform((v) => v || null),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
      order: z.coerce.number().int().min(0).max(99),
      discordRoleId: roleId,
    })
    .parse({
      name: fd.get("name"),
      description: fd.get("description") ?? "",
      color: fd.get("color") ?? "#06d4ec",
      order: fd.get("order") || 0,
      discordRoleId: fd.get("discordRoleId") ?? "",
    });
  return { ...data, permissions: parsePermissions(fd) };
}

/** Gerência: nome, setor (opcional), cargo do Discord e permissões que soma. */
export function parseManagementForm(fd: FormData) {
  const data = z
    .object({
      name: z.string().trim().min(2, "Nome muito curto").max(40),
      order: z.coerce.number().int().min(0).max(99),
      sectorId: z.string().transform((v) => v || null),
      discordRoleId: roleId,
    })
    .parse({
      name: fd.get("name"),
      order: fd.get("order") || 0,
      sectorId: fd.get("sectorId") ?? "",
      discordRoleId: fd.get("discordRoleId") ?? "",
    });
  return { ...data, permissions: parsePermissions(fd) };
}
