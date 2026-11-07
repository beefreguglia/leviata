import { expect, test } from "@playwright/test";
import { FIXTURE, as, expectImageLoaded, expectToast, uid, uploadImages } from "./helpers";

test.describe("farm (gerência)", () => {
  test.use(as("gerente"));

  test("guia com item, prints e rendimento; aparece na calculadora; filtro por risco", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const s = uid();
    const item = `Cobre ${s}`;
    const title = `Cobre na pedreira ${s}`;
    await page.goto("/fabricacao");
    await page.getByRole("button", { name: "Novo item" }).click();
    await page.getByRole("dialog").getByLabel("Nome").fill(item);
    await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
    await expectToast(page, `${item} cadastrado`);

    await page.goto("/farm/novo");
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Item que rende").selectOption({ label: item });
    await page.getByLabel("Risco").selectOption("MEDIO");
    await page.getByLabel("Local").fill("Pedreira de Sandy Shores");
    await page.getByLabel("Quanto rende por rodada").fill("12");
    await page.getByLabel("Minutos por rodada").fill("6");
    await uploadImages(page, "Adicionar prints", [FIXTURE.print, FIXTURE.flyer]);
    await expect(page.getByRole("button", { name: "Remover imagem" })).toHaveCount(2);
    await page.locator('textarea[name="howTo"]').fill("1. Pegue a picareta\n2. Quebre as pedras");
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("~120 un/hora")).toBeVisible();
    const imgs = page.getByTestId("farm-images").getByRole("img");
    await expect(imgs).toHaveCount(2);
    await expectImageLoaded(imgs.first());

    await page.goto("/farm?risco=MEDIO");
    await expect(page.getByTestId("farm-card").filter({ hasText: title })).toBeVisible();
    await page.goto("/farm?risco=ALTO");
    await expect(page.getByTestId("farm-card").filter({ hasText: title })).toHaveCount(0);

    await page.goto("/fabricacao");
    await expect(page.getByText(item).locator("..").getByText("Tem guia de farm")).toBeVisible();
  });
});

test.describe("farm (soldado)", () => {
  test.use(as("soldado"));
  test("lê, mas não cria", async ({ page }) => {
    await page.goto("/farm");
    await expect(page.getByRole("link", { name: "Novo guia" })).toHaveCount(0);
  });
});
