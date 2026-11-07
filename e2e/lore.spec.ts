import { expect, test } from "@playwright/test";
import { FIXTURE, as, expectImageLoaded, uid, uploadImages } from "./helpers";

test.describe("lore (gerência)", () => {
  test.use(as("gerente"));

  test("escrever com capa, achar na linha do tempo, filtrar por tag, editar e apagar", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const title = `A noite do porto ${uid()}`;
    const tag = `tag${uid()}`;
    await page.goto("/lore");
    await page.getByRole("link", { name: "Escrever" }).click();
    await uploadImages(page, "Adicionar capa", [FIXTURE.print]);
    await expectImageLoaded(page.getByRole("img", { name: /print\.png|Imagem enviada/ }));
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Categoria").selectOption("EVENTO");
    await page.getByLabel("Quando aconteceu na cidade").fill("2026-10-20");
    await page.getByLabel(/^Resumo/).fill("O dia em que tudo mudou");
    await page.getByLabel("Tags").fill(`${tag}, porto`);
    await page.locator('textarea[name="content"]').fill("## Começo\nTexto da **lore**");
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.locator("article strong", { hasText: "lore" })).toBeVisible();
    await expectImageLoaded(page.locator("main img").first());

    await page.goto("/lore");
    const card = page.getByTestId("lore-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(page.getByRole("heading", { name: /outubro de 2026/i })).toBeVisible();

    await page.locator('[aria-label="Tags"]').getByRole("link", { name: new RegExp(`^#${tag}`) }).click();
    await expect(page).toHaveURL(new RegExp(`tag=${tag}`));
    await expect(page.getByTestId("lore-card")).toHaveCount(1);

    await card.click();
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Título").fill(`${title} (editado)`);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("heading", { name: `${title} (editado)` })).toBeVisible();

    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByRole("button", { name: "Apagar" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expect(page).toHaveURL(/\/lore$/);
    await expect(page.getByTestId("lore-card").filter({ hasText: title })).toHaveCount(0);
  });

  test("busca sem resultado", async ({ page }) => {
    await page.goto("/lore?q=nada-com-isso-aqui");
    await expect(page.getByText("Nada encontrado")).toBeVisible();
  });
});

test.describe("lore (soldado)", () => {
  test.use(as("soldado"));
  test("lê, mas não escreve", async ({ page }) => {
    await page.goto("/lore");
    await expect(page.getByRole("link", { name: "Escrever" })).toHaveCount(0);
    await page.goto("/lore/novo");
    await expect(page).toHaveURL(/sem-acesso/);
  });
});
