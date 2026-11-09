import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { allBalances } from "@/lib/vault";
import { goalHistory, salesHistory, vaultHistory } from "@/lib/economy-stats";
import BauPage from "@/app/(painel)/bau/page";
import { ChartCard } from "@/components/charts/chart-card";
import { actAs, db, memberByName, setRankPerms } from "../helpers/db";

/** Procura um valor nas props da árvore do React (a árvore tem ciclos, então não dá para usar JSON). */
function treeHas(node: unknown, text: string, seen = new WeakSet<object>()): boolean {
  if (typeof node === "string") return node === text;
  if (typeof node !== "object" || node === null || seen.has(node)) return false;
  seen.add(node);
  return Object.values(node).some((value) => treeHas(value, text, seen));
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

async function move(asset: "DINHEIRO_SUJO" | "DINHEIRO_LIMPO", kind: "ENTRADA" | "SAIDA", quantity: number, createdAt: Date, status: "CONFIRMADA" | "ESTORNADA" = "CONFIRMADA") {
  await db.vaultTransaction.create({ data: { asset, kind, quantity, status, createdAt } });
}

describe("gráficos da economia", () => {
  it("o último ponto do saldo bate com o saldo do baú, incluindo o que veio antes da janela", async () => {
    await move("DINHEIRO_SUJO", "ENTRADA", 1000, daysAgo(60));
    await move("DINHEIRO_SUJO", "SAIDA", 300, daysAgo(2));
    await move("DINHEIRO_LIMPO", "ENTRADA", 50, daysAgo(1));
    await move("DINHEIRO_LIMPO", "ENTRADA", 999, daysAgo(1), "ESTORNADA");

    const series = await vaultHistory();
    const balances = await allBalances();

    expect(series).toHaveLength(30);
    expect(series.at(-1)).toMatchObject({ dirty: balances.dirty, clean: balances.clean });
    expect(series.at(-1)).toMatchObject({ dirty: 700, clean: 50 });
  });

  it("vendas canceladas ficam de fora do faturamento", async () => {
    const item = await db.item.create({ data: { name: "Colete" } });
    const base = { buyerName: "Fulano", quantity: 2, unitPrice: 100, payment: "DINHEIRO_SUJO" as const, itemId: item.id };
    await db.sale.create({ data: { ...base, buyerKind: "PLAYER" } });
    await db.sale.create({ data: { ...base, buyerKind: "FACCAO", cancelledAt: new Date() } });

    const { byWeek, items } = await salesHistory();

    expect(byWeek.at(-1)).toMatchObject({ player: 200, faccao: 0 });
    expect(items).toEqual([{ name: "Colete", value: 200 }]);
  });

  it("conta só a entrega confirmada na meta da semana", async () => {
    const item = await db.item.create({ data: { name: "Cobre" } });
    await db.farmGoal.create({ data: { itemId: item.id, quantity: 10 } });
    const nina = await memberByName("Nina Torres");
    await db.vaultTransaction.create({ data: { asset: "ITEM", kind: "ENTRADA", quantity: 10, itemId: item.id, memberId: nina.id, status: "PENDENTE" } });

    const before = await goalHistory();
    await db.vaultTransaction.updateMany({ where: { memberId: nina.id, itemId: item.id }, data: { status: "CONFIRMADA" } });
    const after = await goalHistory();

    expect(before.at(-1)?.complete).toBe(0);
    expect(after.at(-1)?.complete).toBe(1);
  });

  it("o gráfico de saldo só vai para a gerência", async () => {
    await setRankPerms("Soldado", ["painel.ver", "economia.ver"]);
    await actAs("dev-soldado");
    expect(treeHas(await BauPage(), "chart-bau-saldo")).toBe(false);
    await actAs("dev-gerente");
    expect(treeHas(await BauPage(), "chart-bau-saldo")).toBe(true);
  });

  it("sem dados mostra o aviso no lugar do gráfico e da tabela", () => {
    const html = renderToStaticMarkup(
      ChartCard({ title: "Saldo", empty: true, emptyText: "Sem dados ainda", testId: "x", table: { columns: ["Dia"], rows: [] }, children: "GRAFICO" }),
    );
    expect(html).toContain("Sem dados ainda");
    expect(html).not.toContain("GRAFICO");
    expect(html).not.toContain("Ver dados");
  });
});
