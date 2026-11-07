import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("membros (gerência)", () => {
  test.use(as("lider"));

  test("lista ordenada por patente e com busca", async ({ page }) => {
    await page.goto("/membros");
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
    const names = page.locator("main a[href^='/membros/'] p.font-medium");
    await expect(names.first()).toHaveText("Dante Moretti");

    await page.getByPlaceholder("Buscar por nome, passaporte ou Discord").fill("1187");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/q=1187/);
    await expect(names).toHaveCount(1);
    await expect(names.first()).toHaveText("Nina Torres");
  });

  test("lista mostra patente como tag e presença como bolinha no avatar", async ({ page }) => {
    await page.goto("/membros?q=Dante");
    const row = page.getByRole("link", { name: /Dante Moretti/ });
    await expect(row.getByRole("img", { name: "Ativo" })).toBeVisible();
    await expect(row.getByText("Líder", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Legenda de presença" })).toContainText("Ausente");
  });

  test("busca sem resultado mostra estado vazio", async ({ page }) => {
    await page.goto("/membros?q=ninguem-tem-esse-nome");
    await expect(page.getByText("Nenhum membro encontrado")).toBeVisible();
  });

  test("cadastrar, abrir, editar e promover", async ({ page }) => {
    const name = `Caio ${uid()}`;
    await page.goto("/membros");
    await page.getByRole("button", { name: "Novo membro" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome no RP").fill(name);
    await dialog.getByLabel("Passaporte / ID").fill(String(Date.now()).slice(-6));
    await dialog.getByLabel("Patente").selectOption({ label: "Recruta" });
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expectToast(page, `${name} cadastrado`);
    await expect(dialog).toBeHidden();

    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("Entrada na fac")).toBeVisible();

    // editar
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("dialog").getByLabel("Telefone no jogo").fill("555-0101");
    await page.getByRole("dialog").getByLabel("Status").selectOption("AFASTADO");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Ficha atualizada");
    await expect(page.getByText("555-0101")).toBeVisible();
    await expect(page.getByRole("main").locator("span", { hasText: /^Afastado$/ })).toBeVisible();
    await expect(page.getByRole("main").getByRole("img", { name: "Afastado" })).toBeVisible();

    // promover
    await page.getByRole("button", { name: "Patente" }).click();
    await page.getByRole("dialog").getByLabel("Nova patente").selectOption({ label: "Soldado" });
    await page.getByRole("dialog").getByLabel("Motivo").fill("Mandou bem");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Patente alterada");
    await expect(page.getByText("Recruta → Soldado")).toBeVisible();
    await expect(page.getByText(/Mandou bem/)).toBeVisible();
  });

  test("passaporte repetido mostra erro e mantém o diálogo aberto", async ({ page }) => {
    await page.goto("/membros");
    await page.getByRole("button", { name: "Novo membro" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome no RP").fill("Clone do Dante");
    await dialog.getByLabel("Passaporte / ID").fill("1001");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expectToast(page, "Passaporte 1001 já é de Dante Moretti");
    await expect(dialog).toBeVisible();
  });

  test("filtro por status", async ({ page }) => {
    await page.goto("/membros");
    await page.getByLabel("Filtrar por status").selectOption("EXPULSO");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/status=EXPULSO/);
    await expect(page.getByText("Nenhum membro encontrado")).toBeVisible();
  });
});

test.describe("membros (soldado)", () => {
  test.use(as("soldado"));

  test("vê a lista e fichas, mas não edita", async ({ page }) => {
    await page.goto("/membros");
    await expect(page.getByRole("button", { name: "Novo membro" })).toHaveCount(0);
    await page.getByRole("link", { name: /Dante Moretti/ }).click();
    await expect(page.getByRole("heading", { name: "Dante Moretti" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Patente" })).toHaveCount(0);
  });

  test("ficha inexistente dá 404", async ({ page }) => {
    const res = await page.goto("/membros/nao-existe");
    expect(res?.status()).toBe(404);
  });
});
