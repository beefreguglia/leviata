import { z } from "zod";
import { startOfDayBRT } from "@/lib/dates";
import { EDITABLE_STATUSES } from "@/lib/members";

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
  status: z.enum(EDITABLE_STATUSES).default("ATIVO"),
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

/** Registro feito pelo próprio membro (como no canal de registro do Discord). */
export const registrationSchema = z.object({
  rpName: z.string().trim().min(2, "Informe seu nome na cidade").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{6,20}$/, "Número inválido — ex.: (055) 000-000"),
  passport: z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, "ID inválido — só números"),
});

export function parseRegistrationForm(fd: FormData) {
  const get = (k: string) => (typeof fd.get(k) === "string" ? String(fd.get(k)) : "");
  return registrationSchema.parse({ rpName: get("rpName"), phone: get("phone"), passport: get("passport") });
}

/** Desligar membro: saiu por conta própria ou expulsão. */
export const dismissSchema = z.object({
  kind: z.enum(["SAIU", "EXPULSO"], { message: "Escolha o motivo do desligamento" }),
  reason: z.string().trim().min(3, "Explique o motivo").max(500),
});

export function parseDismissForm(fd: FormData) {
  return dismissSchema.parse({ kind: fd.get("kind"), reason: fd.get("reason") ?? "" });
}
