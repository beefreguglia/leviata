import { expect, test } from "@playwright/test";
import { as } from "./helpers";

test.describe("início (líder)", () => {
  test.use(as("lider"));

  test("saudação, números e atividade recente", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /(Bom dia|Boa tarde|Boa noite), Dante/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Membros ativos/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fora agora/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Aguardando aprovação/ })).toBeVisible();
    await expect(page.getByText("Próximas ações e corridas")).toBeVisible();
  });

  test("cartões levam aos módulos", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Membros ativos/ }).click();
    await expect(page).toHaveURL(/\/membros$/);
  });
});

test.describe("início (soldado)", () => {
  test.use(as("soldado"));
  test("não vê aprovações nem atividade recente", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Nina/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Aguardando aprovação/ })).toHaveCount(0);
    await expect(page.getByText("Atividade recente")).toHaveCount(0);
  });
});
