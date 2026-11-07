import { z } from "zod";
import { endOfDayBRT } from "@/lib/dates";
import { optionalText } from "@/lib/schemas/content";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};
const positiveInt = (msg: string) =>
  z.coerce.number({ error: msg }).int(msg).min(1, msg).max(1_000_000_000, "Valor alto demais");

export const vaultMoveSchema = z
  .object({
    kind: z.enum(["ENTRADA", "SAIDA"], { error: "Escolha entrada ou saída" }),
    asset: z.enum(["DINHEIRO_SUJO", "DINHEIRO_LIMPO", "ITEM"], { error: "Escolha o que movimentar" }),
    itemId: z.string().nullable(),
    quantity: positiveInt("Quantidade deve ser um número inteiro maior que zero"),
    reason: optionalText(300),
    memberId: z.string().nullable(),
  })
  .refine((m) => m.asset !== "ITEM" || m.itemId, { message: "Escolha o item" });

export function parseVaultMoveForm(fd: FormData) {
  const asset = str(fd, "asset") ?? "ITEM";
  return vaultMoveSchema.parse({
    kind: str(fd, "kind") ?? "ENTRADA",
    asset,
    itemId: asset === "ITEM" ? str(fd, "itemId") || null : null,
    quantity: str(fd, "quantity"),
    reason: str(fd, "reason"),
    memberId: str(fd, "memberId") || null,
  });
}

/** Entrega de farm feita pelo próprio membro (sempre entrada de item). */
export function parseDeliveryForm(fd: FormData) {
  return z
    .object({
      itemId: z.string({ error: "Escolha o item" }).min(1, "Escolha o item"),
      quantity: positiveInt("Quantidade deve ser um número inteiro maior que zero"),
      reason: optionalText(300),
    })
    .parse({ itemId: str(fd, "itemId"), quantity: str(fd, "quantity"), reason: str(fd, "reason") });
}

export function parseGoalForm(fd: FormData) {
  return z
    .object({
      itemId: z.string({ error: "Escolha o item" }).min(1, "Escolha o item"),
      quantity: positiveInt("Meta deve ser um número inteiro maior que zero"),
      rankId: z.string().nullable(),
    })
    .parse({ itemId: str(fd, "itemId"), quantity: str(fd, "quantity"), rankId: str(fd, "rankId") || null });
}

export function parseOrderForm(fd: FormData) {
  return z
    .object({
      customer: z.string().trim().min(2, "Informe o cliente").max(80),
      factionId: z.string().nullable(),
      itemId: z.string({ error: "Escolha o item" }).min(1, "Escolha o item"),
      quantity: positiveInt("Quantidade deve ser um número inteiro maior que zero"),
      unitPrice: z.coerce.number().int().min(0, "Preço inválido").default(0),
      dueAt: z
        .string()
        .optional()
        .transform((v, ctx) => {
          if (!v) return null;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            ctx.addIssue({ code: "custom", message: "Prazo inválido" });
            return z.NEVER;
          }
          return endOfDayBRT(v);
        }),
      assignedToId: z.string().nullable(),
      notes: optionalText(1000),
      paid: z.boolean(),
    })
    .parse({
      customer: str(fd, "customer"),
      factionId: str(fd, "factionId") || null,
      itemId: str(fd, "itemId"),
      quantity: str(fd, "quantity"),
      unitPrice: str(fd, "unitPrice") || 0,
      dueAt: str(fd, "dueAt"),
      assignedToId: str(fd, "assignedToId") || null,
      notes: str(fd, "notes"),
      paid: fd.get("paid") === "on",
    });
}

/** Venda direta para uma facção ou um player. */
export const saleSchema = z
  .object({
    buyerKind: z.enum(["FACCAO", "PLAYER"], { error: "Escolha se o comprador é facção ou player" }),
    factionId: z.string().nullable(),
    buyerName: z.string().trim().max(80).nullable(),
    buyerPassport: z
      .string()
      .trim()
      .regex(/^\d{1,10}$/, "ID do player inválido — só números")
      .nullable(),
    itemId: z.string({ error: "Escolha o item" }).min(1, "Escolha o item"),
    quantity: positiveInt("Quantidade deve ser um número inteiro maior que zero"),
    unitPrice: z.coerce.number({ error: "Preço inválido" }).int("Preço inválido").min(0, "Preço inválido").max(1_000_000_000, "Valor alto demais"),
    payment: z.enum(["DINHEIRO_SUJO", "DINHEIRO_LIMPO"], { error: "Escolha como foi pago" }),
    fromVault: z.boolean(),
    sellerId: z.string().nullable(),
    notes: optionalText(500),
  })
  .refine((v) => v.buyerKind !== "FACCAO" || v.factionId, { message: "Escolha a facção", path: ["factionId"] })
  .refine((v) => v.buyerKind !== "PLAYER" || (v.buyerName && v.buyerName.length >= 2), { message: "Informe o nome do player", path: ["buyerName"] });

export function parseSaleForm(fd: FormData) {
  const buyerKind = str(fd, "buyerKind") ?? "PLAYER";
  return saleSchema.parse({
    buyerKind,
    factionId: buyerKind === "FACCAO" ? str(fd, "factionId") || null : null,
    buyerName: buyerKind === "PLAYER" ? str(fd, "buyerName") ?? null : null,
    buyerPassport: buyerKind === "PLAYER" ? str(fd, "buyerPassport")?.trim() || null : null,
    itemId: str(fd, "itemId"),
    quantity: str(fd, "quantity"),
    unitPrice: str(fd, "unitPrice") || 0,
    payment: str(fd, "payment") ?? "DINHEIRO_SUJO",
    fromVault: fd.get("fromVault") === "on",
    sellerId: str(fd, "sellerId") || null,
    notes: str(fd, "notes"),
  });
}

export const PUNISHMENT_KINDS = ["ADVERTENCIA", "MULTA", "SUSPENSAO", "REBAIXAMENTO", "EXPULSAO"] as const;

export function parsePunishmentForm(fd: FormData) {
  return z
    .object({
      memberId: z.string({ error: "Escolha o membro" }).min(1, "Escolha o membro"),
      kind: z.enum(PUNISHMENT_KINDS, { error: "Tipo inválido" }),
      reason: z.string().trim().min(5, "Explique o motivo (mínimo 5 letras)").max(1000),
      fineAmount: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === undefined || v === "" ? null : Number(v)))
        .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Valor da multa inválido"),
      days: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === undefined || v === "" ? null : Number(v)))
        .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 365), "Duração inválida (1 a 365 dias)"),
      toRankId: z.string().nullable(),
    })
    .refine((p) => p.kind !== "MULTA" || p.fineAmount, { message: "Informe o valor da multa" })
    .refine((p) => p.kind !== "SUSPENSAO" || p.days, { message: "Informe quantos dias de suspensão" })
    .refine((p) => p.kind !== "REBAIXAMENTO" || p.toRankId, { message: "Escolha a nova patente" })
    .parse({
      memberId: str(fd, "memberId"),
      kind: str(fd, "kind"),
      reason: str(fd, "reason"),
      fineAmount: str(fd, "fineAmount"),
      days: str(fd, "days"),
      toRankId: str(fd, "toRankId") || null,
    });
}

/** Quantas advertências ativas disparam o alerta de "próxima punição". */
export const WARNING_LIMIT = 3;
