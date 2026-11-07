import { z } from "zod";
import { fromDateTimeInputBRT } from "@/lib/dates";
import { optionalInt, optionalText } from "@/lib/schemas/content";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// ---------------- Mapa ----------------
export const PIN_CATEGORIES = ["BASE", "FARM", "DESMANCHE", "LAVAGEM", "LOJA", "FUGA", "ESCONDERIJO", "TERRITORIO", "ALVO", "OUTRO"] as const;

export const pinSchema = z.object({
  title: z.string().trim().min(2, "Nome muito curto").max(80),
  description: optionalText(4000),
  category: z.enum(PIN_CATEGORIES, { error: "Categoria inválida" }),
  x: z.coerce.number({ error: "Posição inválida" }).finite().min(0, "Fora do mapa"),
  y: z.coerce.number({ error: "Posição inválida" }).finite().min(0, "Fora do mapa"),
  imageIds: z.array(z.string()).max(6, "Máximo de 6 prints"),
  farmGuideId: z.string().nullable(),
  factionId: z.string().nullable(),
});

export function parsePinForm(fd: FormData) {
  return pinSchema.parse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category") ?? "OUTRO",
    x: str(fd, "x"),
    y: str(fd, "y"),
    imageIds: fd.getAll("imageIds").map(String).filter(Boolean),
    farmGuideId: str(fd, "farmGuideId") || null,
    factionId: str(fd, "factionId") || null,
  });
}

/** Garante que o ponto está dentro da imagem do mapa. */
export function assertInsideMap(x: number, y: number, map: { width: number; height: number }) {
  if (x > map.width || y > map.height) throw new Error("Fora do mapa");
}

export const mapConfigSchema = z.object({
  imageId: z.string().min(1, "Envie a imagem do mapa"),
  width: z.coerce.number().int().min(256, "Imagem muito pequena").max(16384),
  height: z.coerce.number().int().min(256, "Imagem muito pequena").max(16384),
});
export type MapConfig = z.infer<typeof mapConfigSchema>;

// ---------------- Perímetros ----------------
/** Perímetro = título + foto vista de cima (tipo mapa). */
export const perimeterSchema = z.object({
  name: z.string().trim().min(2, "Título muito curto").max(100),
  imageId: z.string().min(1, "Envie a imagem do perímetro"),
});

export function parsePerimeterForm(fd: FormData) {
  return perimeterSchema.parse({ name: str(fd, "name"), imageId: str(fd, "imageId") ?? "" });
}

// ---------------- Agenda ----------------
export const EVENT_KINDS = ["ACAO", "CORRIDA", "REUNIAO", "TREINO", "EVENTO"] as const;

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Título muito curto").max(120),
    kind: z.enum(EVENT_KINDS, { error: "Tipo inválido" }),
    startsAt: z.string({ error: "Informe a data e hora" }).regex(DATETIME, "Informe a data e hora").transform(fromDateTimeInputBRT),
    endsAt: z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        if (!DATETIME.test(v)) {
          ctx.addIssue({ code: "custom", message: "Horário de término inválido" });
          return z.NEVER;
        }
        return fromDateTimeInputBRT(v);
      }),
    location: optionalText(200),
    description: optionalText(5000),
    perimeterId: z.string().nullable(),
    notifyDiscord: z.boolean(),
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, { message: "O término precisa ser depois do início" });

export function parseEventForm(fd: FormData) {
  return eventSchema.parse({
    title: str(fd, "title"),
    kind: str(fd, "kind") ?? "ACAO",
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    location: str(fd, "location"),
    description: str(fd, "description"),
    perimeterId: str(fd, "perimeterId") || null,
    notifyDiscord: fd.get("notifyDiscord") === "on",
  });
}

export const reportSchema = z.object({
  result: z.enum(["SUCESSO", "PARCIAL", "FALHA"], { error: "Resultado inválido" }),
  loot: optionalText(500),
  money: optionalInt,
  casualties: optionalInt,
  arrests: optionalInt,
  notes: optionalText(5000),
});

export function parseReportForm(fd: FormData) {
  return reportSchema.parse({
    result: str(fd, "result"),
    loot: str(fd, "loot"),
    money: str(fd, "money"),
    casualties: str(fd, "casualties"),
    arrests: str(fd, "arrests"),
    notes: str(fd, "notes"),
  });
}

// ---------------- Escalação ----------------
export type LineupInput = { role: string; memberId: string | null; vehicle: string | null; notes: string | null };

export function parseLineupForm(fd: FormData): LineupInput[] {
  const roles = fd.getAll("slotRole").map(String);
  const members = fd.getAll("slotMember").map(String);
  const vehicles = fd.getAll("slotVehicle").map(String);
  const notes = fd.getAll("slotNotes").map(String);
  const slots = roles
    .map((role, i) => ({
      role: role.trim(),
      memberId: members[i] || null,
      vehicle: vehicles[i]?.trim() || null,
      notes: notes[i]?.trim() || null,
    }))
    .filter((s) => s.role !== "");
  if (slots.length > 60) throw new Error("Escalação grande demais (máximo 60 vagas)");
  if (slots.some((s) => s.role.length > 40)) throw new Error("Nome de função muito longo");
  return slots;
}

/** Problemas de uma escalação: membro repetido e membros indisponíveis (ausentes). */
export function lineupProblems(slots: LineupInput[], unavailable: Map<string, string>) {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    if (!s.memberId) continue;
    if (seen.has(s.memberId)) problems.push(`duplicado:${s.memberId}`);
    seen.add(s.memberId);
    if (unavailable.has(s.memberId)) problems.push(`indisponivel:${s.memberId}`);
  }
  return problems;
}
