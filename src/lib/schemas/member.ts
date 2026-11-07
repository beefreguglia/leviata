import { z } from "zod";
import { startOfDayBRT } from "@/lib/dates";

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const memberSchema = z.object({
  rpName: z.string().trim().min(2, "Nome RP muito curto"),
  passport: optional,
  phone: optional,
  status: z.enum(["ATIVO", "INATIVO", "AFASTADO", "EXPULSO"]).default("ATIVO"),
  joinedAt: optional,
  birthday: optional,
  notes: optional,
});

export type MemberInput = z.infer<typeof memberSchema>;

/** Converte o input validado no formato do banco. */
export function memberInputToData(input: MemberInput) {
  return {
    rpName: input.rpName,
    passport: input.passport ?? null,
    phone: input.phone ?? null,
    status: input.status,
    notes: input.notes ?? null,
    joinedAt: input.joinedAt ? startOfDayBRT(input.joinedAt) : undefined,
    birthday: input.birthday ? startOfDayBRT(input.birthday) : null,
  };
}
