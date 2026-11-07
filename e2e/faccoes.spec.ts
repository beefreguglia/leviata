import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("facções (gerência)", () => {
  test.use(as("gerente"));

  test("cadastrar, filtrar por relação, mudar relação (vai pro histórico), registrar evento e apagar", async ({ page }) => {
    const name = `Ballas ${uid()}`;
    await page.goto("/faccoes");
    await page.getByRole("button", { name: "Nova facção" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill(name);
    await dialog.getByLabel("Sigla").fill("BL");
    await dialog.getByLabel("Relação com a Leviata").selectOption("TENSA");
    await dialog.getByLabel("Território").fill("Grove Street");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expectToast(page, `${name} cadastrada`);

    await page.getByRole("link", { name: /Tensa/ }).first().click();
    await expect(page).toHaveURL(/relacao=TENSA/);
    const card = page.getByTestId("faction-card").filter({ hasText: name });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("dialog").getByLabel("Relação com a Leviata").selectOption("GUERRA");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Facção atualizada");
    const timeline = page.getByTestId("faction-timeline");
    await expect(timeline).toContainText("Relação: Tensa → Em guerra");

    await page.getByRole("button", { name: "Registrar" }).click();
    await page.getByRole("dialog").getByLabel("O que aconteceu").fill("Tiroteio na praça");
    await page.getByRole("dialog").getByRole("button", { name: "Registrar" }).click();
    await expectToast(page, "Registrado no histórico");
    await expect(timeline).toContainText("Tiroteio na praça");

    await page.getByRole("button", { name: `Apagar ${name}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expect(page).toHaveURL(/\/faccoes$/);
    await expect(page.getByTestId("faction-card").filter({ hasText: name })).toHaveCount(0);
  });
});

test.describe("facções (soldado)", () => {
  test.use(as("soldado"));
  test("lê, mas não cadastra", async ({ page }) => {
    await page.goto("/faccoes");
    await expect(page.getByRole("heading", { name: "Facções" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova facção" })).toHaveCount(0);
  });
});
