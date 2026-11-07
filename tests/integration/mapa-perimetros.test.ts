import { describe, expect, it } from "vitest";
import { createPin, deletePin, saveMapConfig, updatePin } from "@/app/(painel)/mapa/actions";
import { createPerimeter, deletePerimeter, updatePerimeter } from "@/app/(painel)/perimetros/actions";
import { getMapConfig } from "@/lib/map-config";
import { actAs, db, form, makeUpload } from "../helpers/db";

async function setupMap() {
  const imageId = await makeUpload();
  await actAs("dev-gerente");
  expect(await saveMapConfig(form({ imageId, width: "2000", height: "1500" }))).toEqual({ ok: true, message: "Mapa atualizado" });
  return imageId;
}

describe("mapa", () => {
  it("configura a imagem do mapa", async () => {
    const imageId = await setupMap();
    expect(await getMapConfig()).toEqual({ imageId, width: 2000, height: 1500 });
  });

  it("não marca nada sem mapa configurado", async () => {
    await actAs("dev-gerente");
    expect(await createPin(form({ title: "Base", category: "BASE", x: "10", y: "10" }))).toEqual({ ok: false, error: "Configure a imagem do mapa primeiro" });
  });

  it("marca, edita e remove lugar; bloqueia ponto fora da imagem", async () => {
    await setupMap();
    const print = await makeUpload();
    expect((await createPin(form({ title: "Desmanche", category: "DESMANCHE", x: "1200.6", y: "800", imageIds: [print, "falso"] }))).ok).toBe(true);
    const pin = await db.mapPin.findFirstOrThrow();
    expect(pin).toMatchObject({ x: 1200.6, y: 800, imageIds: [print] });

    expect(await createPin(form({ title: "Longe", category: "OUTRO", x: "2500", y: "10" }))).toEqual({ ok: false, error: "Fora do mapa" });

    expect((await updatePin(pin.id, form({ title: "Desmanche novo", category: "DESMANCHE", x: "10", y: "10" }))).ok).toBe(true);
    expect((await db.mapPin.findFirstOrThrow()).title).toBe("Desmanche novo");
    expect((await deletePin(pin.id)).ok).toBe(true);
    expect(await db.mapPin.count()).toBe(0);
  });

  it("liga o lugar a facção e guia de farm (ids inválidos são recusados)", async () => {
    await setupMap();
    expect(await createPin(form({ title: "Território", category: "TERRITORIO", x: "1", y: "1", factionId: "falso" }))).toEqual({ ok: false, error: "Facção inválida" });
    const faction = await db.faction.create({ data: { name: "Ballas" } });
    expect((await createPin(form({ title: "Território", category: "TERRITORIO", x: "1", y: "1", factionId: faction.id }))).ok).toBe(true);
  });

  it("soldado só vê", async () => {
    await setupMap();
    await actAs("dev-soldado");
    expect((await createPin(form({ title: "Base", category: "BASE", x: "1", y: "1" }))).ok).toBe(false);
  });
});

describe("perímetros", () => {
  const base = { name: "Fleeca fundos", target: "Banco Fleeca", difficulty: "MEDIO", plan: "## Plano", roleName: ["Piloto", "Contenção"], roleQty: ["2", "3"], roleNotes: ["", "Portas"] };

  it("cria com funções em ordem e redireciona", async () => {
    await actAs("dev-gerente");
    await expect(createPerimeter(form(base))).rejects.toMatchObject({ digest: expect.stringContaining("/perimetros/") });
    const p = await db.perimeter.findFirstOrThrow({ include: { roles: { orderBy: { order: "asc" } } } });
    expect(p.roles.map((r) => [r.name, r.quantity, r.order, r.notes])).toEqual([["Piloto", 2, 0, null], ["Contenção", 3, 1, "Portas"]]);
  });

  it("editar substitui as funções", async () => {
    await actAs("dev-gerente");
    await createPerimeter(form(base)).catch(() => {});
    const p = await db.perimeter.findFirstOrThrow();
    await updatePerimeter(p.id, form({ ...base, roleName: ["Hacker"], roleQty: ["1"], roleNotes: [""] })).catch(() => {});
    const roles = await db.perimeterRole.findMany({ where: { perimeterId: p.id } });
    expect(roles.map((r) => r.name)).toEqual(["Hacker"]);
  });

  it("apagar mantém os eventos (sem o vínculo)", async () => {
    await actAs("dev-gerente");
    await createPerimeter(form(base)).catch(() => {});
    const p = await db.perimeter.findFirstOrThrow();
    const ev = await db.event.create({ data: { title: "Ação", startsAt: new Date(), perimeterId: p.id } });
    await expect(deletePerimeter(p.id)).rejects.toMatchObject({ digest: expect.stringContaining(";/perimetros;") });
    expect((await db.event.findUniqueOrThrow({ where: { id: ev.id } })).perimeterId).toBeNull();
  });

  it("precisa de operacoes.gerenciar (soldado não cria)", async () => {
    await actAs("dev-soldado");
    expect((await createPerimeter(form(base))).ok).toBe(false);
  });
});
