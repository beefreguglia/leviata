import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("telas de estado", () => {
  test.use(as("soldado"));

  test("endereço que não existe mostra o 404", async ({ page }) => {
    const res = await page.goto("/nao-existe-isso");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("registro inexistente mostra o 404 dentro do painel (com o menu)", async ({ page }) => {
    // com loading.tsx a resposta já começou (status 200 + noindex); o que importa é a tela
    await page.goto("/lore/nao-existe");
    await expect(page.getByRole("heading", { name: "Não encontramos isso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Início" }).first()).toBeVisible();
  });

  test("área sem permissão mostra o 403 com volta ao início", async ({ page }) => {
    await page.goto("/auditoria");
    await expect(page).toHaveURL(/sem-acesso/);
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe("toast depois de salvar e redirecionar", () => {
  test.use(as("gerente"));
  test("criar artigo de lore mostra o toast na página do artigo e limpa a URL", async ({ page }) => {
    const title = `Toast ${uid()}`;
    await page.goto("/lore/novo");
    await page.getByLabel("Título").fill(title);
    await page.locator('textarea[name="content"]').fill("Conteúdo");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Criado com sucesso");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page).not.toHaveURL(/ok=/);
  });
});

test.describe("registro", () => {
  test.use(as("recruta"));
  test("membro atualiza nome, número e ID", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: "Meu registro" })).toBeVisible();
    await page.getByLabel("Número").fill("abc");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Número inválido");
    await page.getByLabel("Número").fill("(055) 130-999");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Registro atualizado");
    await page.reload();
    await expect(page.getByLabel("Número")).toHaveValue("(055) 130-999");
  });
});

test.describe("tipografia e créditos", () => {
  test.use(as("lider"));
  test("manual ao vivo abre para quem tem acesso total e o crédito aparece no menu", async ({ page }) => {
    await page.goto("/design/tipografia");
    await expect(page.getByRole("heading", { name: "Tipografia" })).toBeVisible();
    await expect(page.getByText(".type-h1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Bernardo Freguglia" })).toHaveAttribute("href", "https://github.com/beefreguglia");
    // título de página usa a fonte de título
    const family = await page.getByRole("heading", { name: "Tipografia" }).evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Bebas/i);
  });
});

test.describe("tipografia (soldado)", () => {
  test.use(as("soldado"));
  test("soldado não abre o manual", async ({ page }) => {
    await page.goto("/design/tipografia");
    await expect(page).toHaveURL(/sem-acesso/);
  });
});
