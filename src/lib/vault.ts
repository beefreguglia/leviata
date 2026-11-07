import "server-only";
import { db } from "@/lib/db";
import type { Prisma, VaultAsset } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

/** Saldo atual de um dinheiro ou item (só confirmadas). */
export async function balanceOf(tx: Tx, asset: VaultAsset, itemId: string | null) {
  const where = { status: "CONFIRMADA" as const, asset, ...(asset === "ITEM" ? { itemId } : {}) };
  const [inSum, outSum] = await Promise.all([
    tx.vaultTransaction.aggregate({ where: { ...where, kind: "ENTRADA" }, _sum: { quantity: true } }),
    tx.vaultTransaction.aggregate({ where: { ...where, kind: "SAIDA" }, _sum: { quantity: true } }),
  ]);
  return (inSum._sum.quantity ?? 0) - (outSum._sum.quantity ?? 0);
}

/** Lança erro se tirar `quantity` deixaria o saldo negativo. */
export async function assertCanTake(tx: Tx, asset: VaultAsset, itemId: string | null, quantity: number, label: string) {
  const balance = await balanceOf(tx, asset, itemId);
  if (quantity > balance) throw new Error(`Saldo insuficiente de ${label}: tem ${balance.toLocaleString("pt-BR")}, precisa de ${quantity.toLocaleString("pt-BR")}`);
}

/** Saldos de tudo (para a página do baú e o início). */
export async function allBalances() {
  const rows = await db.vaultTransaction.groupBy({
    by: ["asset", "itemId", "kind"],
    where: { status: "CONFIRMADA" },
    _sum: { quantity: true },
  });
  let dirty = 0;
  let clean = 0;
  const items = new Map<string, number>();
  for (const r of rows) {
    const v = (r._sum.quantity ?? 0) * (r.kind === "ENTRADA" ? 1 : -1);
    if (r.asset === "DINHEIRO_SUJO") dirty += v;
    else if (r.asset === "DINHEIRO_LIMPO") clean += v;
    else if (r.itemId) items.set(r.itemId, (items.get(r.itemId) ?? 0) + v);
  }
  return { dirty, clean, items };
}
