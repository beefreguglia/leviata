import { expect, test } from "@playwright/test";
import { as, expectToast } from "./helpers";

test.describe("assistente (soldado)", () => {
  test.use(as("soldado"));

  test("abre o chat, prepara um registro no diário e só salva ao confirmar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Abrir o assistente" }).click();
    const panel = page.getByTestId("assistant-panel");
    await expect(panel.getByRole("heading", { name: "Assistente" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "O que eu consigo fazer no painel?" })).toBeVisible();

    await panel.getByLabel("Mensagem para o assistente").fill("anota no diário que teve perseguição");
    await panel.getByLabel("Mensagem para o assistente").press("Enter");
    const card = panel.getByTestId("assistant-action");
    await expect(card).toContainText("Registrar no diário");
    await expect(card).toContainText("Teste do assistente");

    await card.getByRole("button", { name: "Confirmar" }).click();
    await expectToast(page, "Registrado no diário");
    await expect(card).toContainText("Registrado no diário");

    await page.keyboard.press("Escape");
    await page.goto("/diario");
    await expect(page.getByTestId("diary-entry").filter({ hasText: "Teste do assistente" }).first()).toBeVisible();
  });
});

