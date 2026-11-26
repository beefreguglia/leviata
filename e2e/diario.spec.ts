import { expect, test } from "@playwright/test";
import { as, expectToast, uid, pick } from "./helpers";

test.describe("diário (soldado)", () => {
  test.use(as("soldado"));

  test("registra hoje, edita, navega pelos dias e apaga o próprio registro", async ({ page }) => {
    const title = `Perseguição na ponte ${uid()}`;
    await page.goto("/diario");
    await expect(page.getByRole("heading", { name: "Diário" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próximo dia" })).toBeDisabled();

    await page.getByRole("button", { name: "Registrar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("O que aconteceu").fill(title);
    await pick(dialog.getByLabel("Tipo"), "POLICIA");
    await dialog.getByRole("button", { name: "Registrar" }).click();
    await expectToast(page, "Registrado no diário");

    const card = page.getByTestId("diary-entry").filter({ hasText: title });
    await expect(card).toContainText("Polícia");

    await card.getByRole("button", { name: `Editar "${title}"` }).click();
    await page.getByRole("dialog").getByLabel("O que aconteceu").fill(`${title} (editado)`);
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Registro atualizado");
    await expect(page.getByTestId("diary-entry").filter({ hasText: `${title} (editado)` })).toBeVisible();

    await page.getByRole("link", { name: "Dia anterior" }).click();
    await expect(page).toHaveURL(/dia=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByTestId("diary-entry").filter({ hasText: title })).toHaveCount(0);
    await page.getByRole("link", { name: "Hoje" }).click();
    await expect(page).toHaveURL(/\/diario$/);

    await page.getByRole("button", { name: `Apagar "${title} (editado)"` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expectToast(page, "Registro apagado");
    await expect(page.getByTestId("diary-entry").filter({ hasText: title })).toHaveCount(0);
  });
});
