import { expect, test } from "@playwright/test";
import { FIXTURE, as, expectImageLoaded, expectToast, uid, uploadImages } from "./helpers";

test.describe("mural (gerência)", () => {
  test.use(as("gerente"));

  test("publicar aviso fixado, aparecer no início, editar, desafixar e apagar", async ({ page }) => {
    const title = `Reunião ${uid()}`;
    await page.goto("/mural");
    await page.getByRole("button", { name: "Novo aviso" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill(title);
    await dialog.getByLabel("Prioridade").selectOption("IMPORTANTE");
    await dialog.locator('textarea[name="content"]').fill("Presença **obrigatória**");
    await dialog.getByLabel("Fixar no topo do mural e do início").check();
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Aviso publicado");

    const card = page.getByTestId("notice").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByLabel("Fixado")).toBeVisible();
    await expect(card.locator("strong", { hasText: "obrigatória" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByTestId("notice").filter({ hasText: title })).toBeVisible();

    await page.goto("/mural");
    await card.getByRole("button", { name: `Editar aviso ${title}` }).click();
    await page.getByRole("dialog").locator('textarea[name="content"]').fill("Mudou para domingo");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Aviso atualizado");
    await expect(card).toContainText("Mudou para domingo");

    await card.getByRole("button", { name: "Desafixar" }).click();
    await expectToast(page, "Aviso desafixado");
    await expect(card.getByLabel("Fixado")).toHaveCount(0);

    await card.getByRole("button", { name: `Apagar aviso ${title}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expectToast(page, "Aviso apagado");
    await expect(card).toHaveCount(0);
  });

  test("publicar flyer com imagem e ver na aba Flyers", async ({ page }) => {
    const title = `Corrida ${uid()}`;
    await page.goto("/mural");
    await page.getByRole("button", { name: "Novo flyer" }).click();
    const dialog = page.getByRole("dialog");
    await uploadImages(dialog, "Imagem do flyer", [FIXTURE.flyer]);
    await expectImageLoaded(dialog.getByRole("img", { name: /flyer\.png|Imagem enviada/ }));
    await dialog.getByLabel("Título").fill(title);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Flyer publicado");

    await page.getByRole("navigation", { name: "Seções do mural" }).getByRole("link", { name: /Flyers/ }).click();
    await expect(page).toHaveURL(/aba=flyers/);
    const flyer = page.getByTestId("flyer").filter({ hasText: title });
    await expectImageLoaded(flyer.getByRole("img", { name: title }));
  });

  test("arquivo que não é imagem é recusado no upload", async ({ page }) => {
    await page.goto("/mural");
    await page.getByRole("button", { name: "Novo flyer" }).click();
    await uploadImages(page.getByRole("dialog"), "Imagem do flyer", [FIXTURE.notImage]);
    await expectToast(page, /Formato não suportado/);
  });
});

test.describe("mural (soldado)", () => {
  test.use(as("soldado"));
  test("lê, mas não publica", async ({ page }) => {
    await page.goto("/mural");
    await expect(page.getByRole("heading", { name: "Mural & Flyers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo aviso" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo flyer" })).toHaveCount(0);
  });
});
