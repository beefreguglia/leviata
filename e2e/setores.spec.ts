import { expect, test } from "@playwright/test";
import { as, expectToast } from "./helpers";

test.describe("setores e gerências", () => {
  test.use(as("lider"));

  test("hierarquia mostra setores e gerências; líder põe alguém num setor e filtra", async ({ page }) => {
    await page.goto("/hierarquia");
    await expect(page.getByRole("heading", { name: "Setores" })).toBeVisible();
    for (const name of ["Vanguarda", "Propulsão", "Vigília", "Comércio"]) {
      await expect(page.getByTestId("sector-card").filter({ hasText: name, visible: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Gerências" })).toBeVisible();
    await expect(page.getByTestId("management-row").filter({ hasText: "G-Geral", visible: true })).toBeVisible();

    // coloca a Nina na Vanguarda com G-Ação
    await page.goto("/membros?q=Nina");
    await page.getByRole("main").getByRole("link", { name: /Nina Torres/ }).click();
    await page.getByRole("button", { name: "Setor" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Setor").selectOption({ label: "Vanguarda (Ações)" });
    await d.getByLabel("G-Ação").check();
    await d.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Setor e gerências atualizados");
    await expect(page.getByRole("main").getByText("G-Ação", { exact: true }).first()).toBeVisible();

    await page.goto("/hierarquia");
    const vanguarda = page.getByTestId("sector-card").filter({ hasText: "Vanguarda", visible: true });
    await expect(vanguarda.getByRole("link", { name: "Nina Torres" })).toBeVisible();
    await expect(vanguarda).toContainText("G-Ação");

    await page.goto("/membros");
    await page.getByLabel("Filtrar por setor").selectOption({ label: "Vanguarda" });
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/setor=/);
    await expect(page.getByRole("main").getByRole("link", { name: /Nina Torres/ })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Dante Moretti/ })).toHaveCount(0);
  });
});

test.describe("setores (soldado)", () => {
  test.use(as("soldado"));
  test("vê setores, mas não edita", async ({ page }) => {
    await page.goto("/hierarquia");
    await expect(page.getByRole("heading", { name: "Setores" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo setor" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Editar setor/ })).toHaveCount(0);
  });
});
