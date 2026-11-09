import { z } from "zod";
import { optionalText } from "@/lib/schemas/content";

export const DOSSIER_STATUSES = ["LIVRE", "PRESO", "FORAGIDO", "MORTO", "DESCONHECIDO"] as const;
export const THREATS = ["BAIXO", "MEDIO", "ALTO"] as const;

const str = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return typeof value === "string" ? value : undefined;
};

const dossierSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  nickname: optionalText(80),
  phone: optionalText(20),
  passport: optionalText(20),
  status: z.enum(DOSSIER_STATUSES, { error: "Situação inválida" }),
  threat: z.enum(THREATS, { error: "Ameaça inválida" }),
  notes: optionalText(8000),
  factionId: z.string().nullable(),
  imageIds: z.array(z.string()).max(8, "Máximo de 8 prints"),
});

export function parseDossierForm(fd: FormData) {
  return dossierSchema.parse({
    name: str(fd, "name") ?? "",
    nickname: str(fd, "nickname"),
    phone: str(fd, "phone"),
    passport: str(fd, "passport"),
    status: str(fd, "status") ?? "DESCONHECIDO",
    threat: str(fd, "threat") ?? "BAIXO",
    notes: str(fd, "notes"),
    factionId: str(fd, "factionId") || null,
    imageIds: fd.getAll("imageIds").map(String).filter(Boolean),
  });
}

export function parseVehicleForm(fd: FormData) {
  return z
    .object({
      plate: z.string().trim().min(2, "Placa muito curta").max(12).toUpperCase(),
      model: optionalText(60),
      color: optionalText(30),
    })
    .parse({ plate: str(fd, "plate") ?? "", model: str(fd, "model"), color: str(fd, "color") });
}

export function parseDossierLinkForm(fd: FormData) {
  return z
    .object({
      toId: z.string().min(1, "Escolha a pessoa"),
      description: z.string().trim().min(2, "Descreva o vínculo").max(120),
    })
    .parse({ toId: str(fd, "toId") ?? "", description: str(fd, "description") ?? "" });
}
