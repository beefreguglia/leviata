import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("hierarquia (líder)", () => {
  test.use(as("lider"));

  test("organograma mostra patentes em ordem com membros", async ({ page }) => {
    await page.goto("/hierarquia");
    const headings = page.locator("main section h2");
    await expect(headings.nth(0)).toContainText("Líder");
    await expect(headings.nth(1)).toContainText("Sub-líder");
    await expect(page.locator("section", { has: page.getByRole("heading", { name: /^Líder/ }) }).getByRole("link", { name: /Dante Moretti/ })).toBeVisible();
  });

  test("criar, editar e apagar patente", async ({ page }) => {
    const name = `Conselho ${uid()}`;
    await page.goto("/hierarquia");
    await page.getByRole("button", { name: "Nova patente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill(name);
    await dialog.getByLabel("Acessar o painel interno").check();
    await dialog.getByRole("button", { name: "Criar" }).click();
    await expectToast(page, `Patente ${name} criada`);
    await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();

    await page.getByRole("button", { name: `Editar ${name}` }).click();
    await page.getByRole("dialog").getByLabel("ID do cargo no Discord").fill("123456789");
    await page.getByRole("dialog").getByLabel("Editar regras").check();
    // permissões uma por uma: marca o grupo Operações inteiro e tira só as escalações
    const ops = page.getByRole("dialog").getByTestId("permission-group").filter({ hasText: "Operações" });
    await ops.getByRole("button", { name: "Marcar todas" }).click();
    await ops.getByLabel("Montar e publicar escalações").uncheck();
    await expect(ops.getByRole("button", { name: "Marcar todas" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Patente atualizada");
    const summary = page.getByText(/Cargo Discord 123456789 · Acessar o painel interno, Editar regras/);
    await expect(summary).toContainText("Agendar ações e corridas e escrever relatórios");
    await expect(summary).toContainText("Criar e editar perímetros");
    await expect(summary).not.toContainText("escalações");

    await page.getByRole("button", { name: `Apagar ${name}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expectToast(page, "Patente apagada");
    await expect(page.getByRole("heading", { name: new RegExp(name) })).toHaveCount(0);
  });

  test("não apaga patente com membros", async ({ page }) => {
    await page.goto("/hierarquia");
    await page.getByRole("button", { name: "Apagar Gerente" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expectToast(page, /Mova os \d+ membros desta patente/);
  });

  test("ID de cargo inválido mostra erro", async ({ page }) => {
    await page.goto("/hierarquia");
    await page.getByRole("button", { name: "Editar Recruta" }).click();
    await page.getByRole("dialog").getByLabel("ID do cargo no Discord").fill("abc");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "ID do cargo deve ter só números");
  });
});

test.describe("hierarquia (gerente)", () => {
  test.use(as("gerente"));
  test("vê o organograma mas não gerencia patentes", async ({ page }) => {
    await page.goto("/hierarquia");
    await expect(page.getByRole("heading", { name: "Hierarquia" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova patente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
  });
});
