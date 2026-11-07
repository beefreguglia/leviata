import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("regras (gerência)", () => {
  test.use(as("gerente"));

  test("/regras abre a primeira página e lista as demais", async ({ page }) => {
    await page.goto("/regras");
    await expect(page).toHaveURL(/\/regras\/estatuto$/);
    await expect(page.getByRole("heading", { name: "Estatuto da Leviata" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Lealdade" })).toBeVisible();
    await page.getByRole("link", { name: "Conduta e punições" }).click();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("criar página com prévia, editar, ver histórico e apagar", async ({ page }) => {
    const title = `Regras de corrida ${uid()}`;
    await page.goto("/regras");
    await page.getByRole("link", { name: "Nova página" }).click();
    await page.getByLabel("Título").fill(title);
    await page.locator('textarea[name="content"]').fill("## Largada\n- Sem **bater** na largada");
    await page.getByRole("tab", { name: "Visualizar" }).click();
    await expect(page.getByRole("heading", { name: "Largada" })).toBeVisible();
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.locator("article strong", { hasText: "bater" })).toBeVisible();

    await page.getByRole("link", { name: "Editar" }).click();
    await page.locator('textarea[name="content"]').fill("## Largada\n- Sem bater\n- Respeitar a bandeira");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Respeitar a bandeira")).toBeVisible();

    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(page.locator("details")).toHaveCount(2);
    await expect(page.getByText("versão atual")).toBeVisible();

    await page.goto(page.url().replace("/historico", "/editar"));
    await page.getByRole("button", { name: "Apagar" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expect(page).toHaveURL(/\/regras\/estatuto$/);
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });

  test("título curto mostra erro", async ({ page }) => {
    await page.goto("/regras/nova");
    await page.getByLabel("Título").fill("X");
    await page.locator('textarea[name="content"]').fill("algo");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Título muito curto");
    await expect(page).toHaveURL(/\/regras\/nova$/);
  });
});

test.describe("regras (soldado)", () => {
  test.use(as("soldado"));
  test("lê tudo, mas não edita", async ({ page }) => {
    await page.goto("/regras/conduta");
    await expect(page.getByRole("heading", { name: "Conduta e punições" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nova página" })).toHaveCount(0);
    await page.goto("/regras/estatuto/editar");
    await expect(page).toHaveURL(/sem-acesso/);
  });
});
