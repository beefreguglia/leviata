import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("auditoria", () => {
  test.use(as("lider"));

  test("ação feita no painel aparece no log", async ({ page }) => {
    const name = `Auditado ${uid()}`;
    await page.goto("/membros");
    await page.getByRole("button", { name: "Novo membro" }).click();
    await page.getByRole("dialog").getByLabel("Nome no RP").fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
    await expectToast(page, "cadastrado");

    await page.goto("/auditoria");
    const row = page.locator("main div", { hasText: `Cadastrou ${name}` }).last();
    await expect(row).toBeVisible();
    await expect(row.getByText("Dante Moretti")).toBeVisible();
  });
});

test.describe("auditoria (soldado)", () => {
  test.use(as("soldado"));
  test("sem permissão", async ({ page }) => {
    await page.goto("/auditoria");
    await expect(page).toHaveURL(/sem-acesso/);
  });
});
