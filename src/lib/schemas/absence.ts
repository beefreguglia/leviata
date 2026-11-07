import { z } from "zod";

const day = (msg: string) => z.string({ error: msg }).regex(/^\d{4}-\d{2}-\d{2}$/, msg);

export const absenceSchema = z
  .object({
    startsAt: day("Informe a data de início"),
    endsAt: day("Informe a data de volta"),
    reason: z.string({ error: "Conte o motivo (pode ser curto)" }).trim().min(3, "Conte o motivo (pode ser curto)").max(500),
  })
  .refine((d) => d.endsAt >= d.startsAt, { message: "A volta precisa ser depois do início" });

export function parseAbsenceForm(fd: FormData) {
  return absenceSchema.parse({
    startsAt: fd.get("startsAt") ?? undefined,
    endsAt: fd.get("endsAt") ?? undefined,
    reason: fd.get("reason") ?? undefined,
  });
}
