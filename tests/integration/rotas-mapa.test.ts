import { describe, expect, it } from "vitest";
import { saveRouteProgress } from "@/app/(painel)/mapa/actions";
import { MAP_ROUTES } from "@/lib/map-routes";
import { actAs, db } from "../helpers/db";

describe("rotas do mapa", () => {
  it("as rotas têm as paradas das imagens, dentro do mapa", () => {
    expect(MAP_ROUTES.map((r) => [r.key, r.points.length])).toEqual([
      ["containers-sul", 30],
      ["caixas-cpt", 108],
    ]);
    for (const r of MAP_ROUTES) for (const [x, y] of r.points) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
    }
  });

  it("salva o progresso de cada membro (sem repetir e em ordem)", async () => {
    await actAs("dev-soldado");
    expect(await saveRouteProgress("containers-sul", [2, 0, 1, 1])).toEqual({ ok: true });
    const row = await db.mapRouteProgress.findFirstOrThrow();
    expect(row).toMatchObject({ routeKey: "containers-sul", done: [0, 1, 2] });
    expect((await saveRouteProgress("containers-sul", [])).ok).toBe(true);
    expect((await db.mapRouteProgress.findFirstOrThrow()).done).toEqual([]);
    // outro membro tem o próprio progresso
    await actAs("dev-gerente");
    await saveRouteProgress("containers-sul", [0]);
    expect(await db.mapRouteProgress.count()).toBe(2);
  });

  it("recusa rota ou parada que não existe", async () => {
    await actAs("dev-soldado");
    expect(await saveRouteProgress("rota-falsa", [0])).toEqual({ ok: false, error: "Rota não encontrada" });
    expect(await saveRouteProgress("containers-sul", [30])).toEqual({ ok: false, error: "Parada inválida" });
    expect(await saveRouteProgress("containers-sul", [-1])).toEqual({ ok: false, error: "Parada inválida" });
    expect(await db.mapRouteProgress.count()).toBe(0);
  });
});
