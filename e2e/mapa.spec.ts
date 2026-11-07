import { expect, test } from "@playwright/test";
import { FIXTURE, as, expectToast, uid, uploadImages } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("mapa (gerência)", () => {
  test.use(as("gerente"));

  test("configurar a imagem do mapa (tamanho detectado sozinho)", async ({ page }) => {
    await page.goto("/mapa");
    await page.getByRole("button", { name: /imagem do mapa/ }).click();
    const d = page.getByRole("dialog");
    await uploadImages(d, "Imagem do mapa", [FIXTURE.map]);
    await expect(d.getByText("Tamanho detectado: 400 × 300 px")).toBeVisible();
    await d.getByRole("button", { name: "Salvar mapa" }).click();
    await expectToast(page, "Mapa atualizado");
    await expect(page.getByTestId("map")).toBeVisible();
  });

  test("marcar lugar clicando no mapa, abrir, editar e remover", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const name = `Desmanche ${uid()}`;
    await page.goto("/mapa");
    const map = page.getByTestId("map");
    await expect(map.locator(".leaflet-image-layer")).toBeVisible();

    await page.getByRole("button", { name: "Marcar lugar" }).click();
    await expect(page.getByText("Clique no mapa onde fica o lugar")).toBeVisible();
    const box = (await map.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const d = page.getByRole("dialog");
    // o diálogo fica POR CIMA do mapa (as camadas do Leaflet não podem cobrir o formulário)
    await page.waitForTimeout(400);
    const covered = await d.evaluate((dlg) => {
      const r = dlg.getBoundingClientRect();
      const out: string[] = [];
      for (let fx = 0.05; fx < 1; fx += 0.15)
        for (let fy = 0.05; fy < 1; fy += 0.15) {
          const el = document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy);
          if (el && !dlg.contains(el)) out.push(String(el.className));
        }
      return out;
    });
    expect(covered, "algo do mapa está por cima do diálogo").toEqual([]);
    await d.getByLabel("Nome do lugar").click();
    await d.getByLabel("Nome do lugar").fill(name);
    await d.getByLabel("Categoria").selectOption("DESMANCHE");
    await d.getByLabel("Descrição").fill("Só depois das 22h");
    await d.getByRole("button", { name: "Marcar" }).click();
    await expectToast(page, `"${name}" marcado no mapa`);

    // aparece na lista e como marcador no mapa
    const list = page.getByRole("list", { name: "Lugares no mapa" });
    await expect(list.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    await expect(map.getByRole("button", { name })).toBeVisible();

    await list.getByRole("button", { name: new RegExp(name) }).click();
    const panel = page.getByTestId("pin-panel");
    await expect(panel).toContainText("Só depois das 22h");
    await panel.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("dialog").getByLabel("Nome do lugar").fill(`${name} (editado)`);
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Marcador atualizado");
    await expect(panel).toContainText(`${name} (editado)`);

    await panel.getByRole("button", { name: /Remover/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remover" }).click();
    await expectToast(page, "Marcador removido");
    await expect(list.getByRole("button", { name: new RegExp(name) })).toHaveCount(0);
  });

  test("filtro por categoria esconde da lista", async ({ page }) => {
    const name = `Base ${uid()}`;
    await page.goto("/mapa");
    await page.getByRole("button", { name: "Marcar lugar" }).click();
    const box = (await page.getByTestId("map").boundingBox())!;
    // perto do centro (a imagem de teste é pequena e fica centralizada)
    await page.mouse.click(box.x + box.width / 2 + 25, box.y + box.height / 2 - 25);
    await page.getByRole("dialog").getByLabel("Nome do lugar").fill(name);
    await page.getByRole("dialog").getByLabel("Categoria").selectOption("BASE");
    await page.getByRole("dialog").getByRole("button", { name: "Marcar" }).click();
    await expectToast(page, "marcado no mapa");
    const list = page.getByRole("list", { name: "Lugares no mapa" });
    await expect(list.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    await page.getByLabel("Categorias").getByRole("button", { name: /Base/ }).click();
    await expect(list.getByRole("button", { name: new RegExp(name) })).toHaveCount(0);
  });
});

test.describe("mapa (soldado)", () => {
  test.use(as("soldado"));
  test("vê o mapa, mas não marca", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page.getByRole("heading", { name: "Mapa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar lugar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /imagem do mapa/ })).toHaveCount(0);
  });
});

test.describe("mapa: zoom", () => {
  test.use(as("soldado"));
  test("zoom máximo é o tamanho real da imagem", async ({ page }) => {
    await page.goto("/mapa");
    const map = page.getByTestId("map");
    const img = map.locator(".leaflet-image-layer");
    await expect(img).toBeVisible();
    const zoomIn = map.locator(".leaflet-control-zoom-in");
    for (let i = 0; i < 12 && !(await zoomIn.getAttribute("class"))?.includes("leaflet-disabled"); i++) {
      await zoomIn.click();
      await page.waitForTimeout(300);
    }
    await expect(zoomIn).toHaveClass(/leaflet-disabled/);
    await page.waitForTimeout(400);
    // a imagem de teste tem 400×300: no zoom máximo ela fica exatamente nesse tamanho
    const box = (await img.boundingBox())!;
    expect(Math.round(box.width)).toBe(400);
    expect(Math.round(box.height)).toBe(300);
  });
});
