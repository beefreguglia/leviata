import { z } from "zod";
import { startOfDayBRT } from "@/lib/dates";

/** Texto opcional: "" vira null. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Inteiro opcional (>= 0): "" vira null. */
export const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Use um número inteiro (0 ou mais)" });
      return z.NEVER;
    }
    return n;
  });

/** "YYYY-MM-DD" opcional → Date (início do dia em Brasília) ou null. */
export const optionalDay = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "Data inválida" });
      return z.NEVER;
    }
    return startOfDayBRT(v);
  });

/** "tiroteio, Vespucci , aliança" → ["tiroteio", "vespucci", "aliança"] (sem repetidos, minúsculas). */
export function parseTags(raw: string | null | undefined) {
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((t) => t.length > 0 && t.length <= 30);
  return [...new Set(tags)].slice(0, 12);
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};
const ids = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);

// ---------------- Lore ----------------
export const LORE_CATEGORIES = ["HISTORIA", "EVENTO", "PERSONAGEM", "LUGAR", "ALIANCA"] as const;

export const loreSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(120),
  summary: optionalText(280),
  content: z.string().trim().min(1, "Escreva o conteúdo"),
  category: z.enum(LORE_CATEGORIES, { error: "Categoria inválida" }),
  happenedAt: optionalDay,
  tags: z.array(z.string()),
  isPinned: z.boolean(),
  coverId: z.string().nullable(),
});

export function parseLoreForm(fd: FormData) {
  return loreSchema.parse({
    title: str(fd, "title"),
    summary: str(fd, "summary"),
    content: str(fd, "content"),
    category: str(fd, "category") ?? "HISTORIA",
    happenedAt: str(fd, "happenedAt"),
    tags: parseTags(str(fd, "tags")),
    isPinned: fd.get("isPinned") === "on",
    coverId: ids(fd, "coverId")[0] ?? null,
  });
}

// ---------------- Facções ----------------
export const FACTION_RELATIONS = ["ALIADA", "NEUTRA", "TENSA", "INIMIGA", "GUERRA"] as const;
export const FACTION_EVENT_KINDS = ["ACORDO", "CONFLITO", "TRAICAO", "NEGOCIO", "OUTRO"] as const;

export const factionSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(60),
  tag: optionalText(10),
  color: hexColor,
  relation: z.enum(FACTION_RELATIONS, { error: "Relação inválida" }),
  kind: optionalText(40),
  territory: optionalText(200),
  leader: optionalText(80),
  description: optionalText(10000),
  isActive: z.boolean(),
  logoId: z.string().nullable(),
});

export function parseFactionForm(fd: FormData) {
  return factionSchema.parse({
    name: str(fd, "name"),
    tag: str(fd, "tag"),
    color: str(fd, "color") ?? "#8d8d99",
    relation: str(fd, "relation") ?? "NEUTRA",
    kind: str(fd, "kind"),
    territory: str(fd, "territory"),
    leader: str(fd, "leader"),
    description: str(fd, "description"),
    isActive: fd.get("isActive") === "on",
    logoId: ids(fd, "logoId")[0] ?? null,
  });
}

export const factionEventSchema = z.object({
  kind: z.enum(FACTION_EVENT_KINDS, { error: "Tipo inválido" }),
  title: z.string().trim().min(3, "Descreva o que aconteceu").max(160),
  description: optionalText(4000),
  happenedAt: optionalDay,
});

export function parseFactionEventForm(fd: FormData) {
  return factionEventSchema.parse({
    kind: str(fd, "kind") ?? "OUTRO",
    title: str(fd, "title"),
    description: str(fd, "description"),
    happenedAt: str(fd, "happenedAt"),
  });
}

// ---------------- Itens, farm e fabricação ----------------
export const itemSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(60),
  unit: z.string().trim().min(1).max(10).default("un"),
  isIllegal: z.boolean(),
});

export function parseItemForm(fd: FormData) {
  return itemSchema.parse({
    name: str(fd, "name"),
    unit: str(fd, "unit") || "un",
    isIllegal: fd.get("isIllegal") === "on",
  });
}

export const RISKS = ["BAIXO", "MEDIO", "ALTO"] as const;

export const farmGuideSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(120),
  itemId: z.string().nullable(),
  location: z.string().trim().min(2, "Informe o local").max(200),
  howTo: z.string().trim().min(1, "Explique como farmar"),
  amountPerRun: optionalInt,
  minutesPerRun: optionalInt,
  risk: z.enum(RISKS, { error: "Risco inválido" }),
  requirements: optionalText(500),
  imageIds: z.array(z.string()).max(8, "Máximo de 8 imagens"),
});

export function parseFarmGuideForm(fd: FormData) {
  return farmGuideSchema.parse({
    title: str(fd, "title"),
    itemId: str(fd, "itemId") || null,
    location: str(fd, "location"),
    howTo: str(fd, "howTo"),
    amountPerRun: str(fd, "amountPerRun"),
    minutesPerRun: str(fd, "minutesPerRun"),
    risk: str(fd, "risk") ?? "BAIXO",
    requirements: str(fd, "requirements"),
    imageIds: ids(fd, "imageIds"),
  });
}

/** Rendimento por hora (null se faltar dado). */
export function yieldPerHour(amountPerRun: number | null, minutesPerRun: number | null) {
  if (!amountPerRun || !minutesPerRun) return null;
  return Math.floor((amountPerRun * 60) / minutesPerRun);
}

export const recipeSchema = z
  .object({
    outputItemId: z.string().min(1, "Escolha o item produzido"),
    outputQty: z.coerce.number().int().min(1, "Quantidade produzida deve ser 1 ou mais"),
    minutes: optionalInt,
    location: optionalText(200),
    notes: optionalText(2000),
    inputs: z
      .array(z.object({ itemId: z.string().min(1), quantity: z.number().int().min(1, "Quantidade de insumo deve ser 1 ou mais") }))
      .min(1, "Adicione pelo menos um insumo"),
  })
  .refine((r) => !r.inputs.some((i) => i.itemId === r.outputItemId), {
    message: "O item produzido não pode ser insumo dele mesmo",
  })
  .refine((r) => new Set(r.inputs.map((i) => i.itemId)).size === r.inputs.length, {
    message: "Insumo repetido — some as quantidades numa linha só",
  });

export function parseRecipeForm(fd: FormData) {
  const itemIds = fd.getAll("inputItemId").map(String);
  const qtys = fd.getAll("inputQty").map(String);
  const inputs = itemIds
    .map((itemId, i) => ({ itemId, quantity: Number(qtys[i]) }))
    .filter((i) => i.itemId !== "");
  return recipeSchema.parse({
    outputItemId: str(fd, "outputItemId") ?? "",
    outputQty: str(fd, "outputQty") || 1,
    minutes: str(fd, "minutes"),
    location: str(fd, "location"),
    notes: str(fd, "notes"),
    inputs,
  });
}

// ---------------- Mural ----------------
export const NOTICE_PRIORITIES = ["NORMAL", "IMPORTANTE", "URGENTE"] as const;

export const noticeSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(120),
  content: z.string().trim().min(1, "Escreva o aviso"),
  priority: z.enum(NOTICE_PRIORITIES, { error: "Prioridade inválida" }),
  isPinned: z.boolean(),
  expiresAt: optionalDay,
  notifyDiscord: z.boolean(),
});

export function parseNoticeForm(fd: FormData) {
  return noticeSchema.parse({
    title: str(fd, "title"),
    content: str(fd, "content"),
    priority: str(fd, "priority") ?? "NORMAL",
    isPinned: fd.get("isPinned") === "on",
    expiresAt: str(fd, "expiresAt"),
    notifyDiscord: fd.get("notifyDiscord") === "on",
  });
}

export const flyerSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(120),
  description: optionalText(1000),
  eventDate: optionalDay,
  imageId: z.string({ error: "Envie a imagem do flyer" }).min(1, "Envie a imagem do flyer"),
});

export function parseFlyerForm(fd: FormData) {
  return flyerSchema.parse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    eventDate: str(fd, "eventDate"),
    imageId: ids(fd, "imageId")[0],
  });
}

// ---------------- Lives ----------------
export const STREAM_PLATFORMS = ["TWITCH", "KICK", "YOUTUBE"] as const;
export type StreamPlatformKey = (typeof STREAM_PLATFORMS)[number];

/**
 * Aceita o link do canal ou só o nome e devolve o identificador que a API usa:
 * - Twitch: login (twitch.tv/<login>)
 * - Kick: slug (kick.com/<slug>)
 * - YouTube: ID do canal (UC...) — @handle não serve para a API de lives
 */
export function normalizeStreamHandle(platform: StreamPlatformKey, raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  v = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^m\./i, "");
  if (platform === "TWITCH") {
    v = v.replace(/^twitch\.tv\//i, "").split(/[/?#]/)[0].toLowerCase();
    return /^[a-z0-9_]{3,25}$/.test(v) ? v : null;
  }
  if (platform === "KICK") {
    v = v.replace(/^kick\.com\//i, "").split(/[/?#]/)[0].toLowerCase();
    return /^[a-z0-9_-]{3,30}$/.test(v) ? v : null;
  }
  v = v.replace(/^youtube\.com\/channel\//i, "").split(/[/?#]/)[0];
  return /^UC[A-Za-z0-9_-]{22}$/.test(v) ? v : null;
}

export const STREAM_HANDLE_HINT: Record<StreamPlatformKey, string> = {
  TWITCH: "Link ou nome do canal (ex.: twitch.tv/leviatarp)",
  KICK: "Link ou nome do canal (ex.: kick.com/leviatarp)",
  YOUTUBE: "Link com o ID do canal (youtube.com/channel/UC…). Em Configurações avançadas do YouTube você encontra o ID.",
};
