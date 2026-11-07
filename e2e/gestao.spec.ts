import { expect, test, type Locator, type Page } from "@playwright/test";
import { ROLES, as, expectToast, uid } from "./helpers";

/** Escolhe a opção de um <select> pelo começo do texto (ex.: "Alvo x · Soldado"). */
async function selectByText(select: Locator, text: string) {
  const value = await select.locator("option", { hasText: text }).first().getAttribute("value");
  await select.selectOption(value!);
}

async function newItem(page: Page, name: string) {
  await page.goto("/fabricacao");
  await page.getByRole("button", { name: "Novo item" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
  await expectToast(page, `${name} cadastrado`);
}

async function newMember(page: Page, name: string) {
  await page.goto("/membros");
  await page.getByRole("button", { name: "Novo membro" }).click();
  await page.getByRole("dialog").getByLabel("Nome no RP").fill(name);
  await page.getByRole("dialog").getByLabel("Patente").selectOption({ label: "Soldado" });
  await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
  await expectToast(page, `${name} cadastrado`);
}

test.describe("baú e metas", () => {
  test.use(as("gerente"));

  test("dinheiro: entrada, saída e saldo insuficiente", async ({ page }) => {
    await page.goto("/bau");
    const register = async (kind: string, value: string) => {
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("main").getByRole("button", { name: "Registrar" }).click();
      const d = page.getByRole("dialog");
      await d.getByLabel("Movimento").selectOption(kind);
      await d.getByLabel("O quê").selectOption("DINHEIRO_LIMPO");
      await d.getByLabel("Valor (R$)").fill(value);
      await d.getByLabel("Motivo").fill(`Teste ${uid()}`);
      await d.getByRole("button", { name: "Registrar" }).click();
    };
    await register("ENTRADA", "50000");
    await expectToast(page, "Entrada registrada");
    await register("SAIDA", "999999999");
    await expectToast(page, /Saldo insuficiente de dinheiro limpo/);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("balance-Dinheiro limpo")).toContainText("R$ 50.000");
  });

  test("meta semanal: soldado entrega → gerência confere → progresso aparece", async ({ page, browser }) => {
    const item = `Cobre ${uid()}`;
    await newItem(page, item);
    await page.goto("/metas");
    await page.getByRole("button", { name: "Nova meta" }).click();
    await page.getByRole("dialog").getByLabel("Item").selectOption({ label: `${item} (un)` });
    await page.getByRole("dialog").getByLabel("Quantidade por semana").fill("50");
    await page.getByRole("dialog").getByRole("button", { name: "Criar meta" }).click();
    await expectToast(page, "Meta criada");

    const nina = await (await browser.newContext({ storageState: ROLES.soldado.file })).newPage();
    await nina.goto("/bau");
    await nina.getByRole("button", { name: "Entregar farm" }).click();
    await nina.getByRole("dialog").getByLabel("Item").selectOption({ label: `${item} (un)` });
    await nina.getByRole("dialog").getByLabel("Quantidade").fill("30");
    await nina.getByRole("dialog").getByRole("button", { name: "Entregar" }).click();
    await expect(nina.locator("[data-sonner-toast]").filter({ hasText: "Entrega enviada" })).toBeVisible();
    await expect(nina.getByTestId("vault-move").filter({ hasText: item })).toContainText("Pendente");

    await page.goto("/bau");
    const pending = page.getByTestId("vault-move").filter({ hasText: item }).filter({ hasText: "Nina Torres" });
    await pending.getByRole("button", { name: "Conferir" }).click();
    await expectToast(page, "Entrega conferida");
    await expect(page.getByTestId("stock-row").filter({ hasText: item })).toContainText("30");

    await nina.goto("/metas");
    const mine = nina.getByTestId("my-goal").filter({ hasText: item });
    await expect(mine).toContainText("30");
    await expect(mine).toContainText("faltam 20");
    await nina.goto("/dashboard");
    await expect(nina.getByTestId("dashboard-goals")).toContainText(item);
  });
});

test.describe("encomendas", () => {
  test.use(as("gerente"));

  test("criar, produzir, marcar pronta e entregar tirando do baú com pagamento", async ({ page }) => {
    const s = uid();
    const item = `Colete ${s}`;
    const customer = `Cliente ${s}`;
    await newItem(page, item);
    await page.goto("/bau");
    await page.getByRole("main").getByRole("button", { name: "Registrar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("O quê").selectOption("ITEM");
    await d.getByLabel("Item").selectOption({ label: `${item} (un)` });
    await d.getByLabel("Quantidade").fill("4");
    await d.getByRole("button", { name: "Registrar" }).click();
    await expectToast(page, "Entrada registrada");

    await page.goto("/encomendas");
    await page.getByRole("button", { name: "Nova encomenda" }).click();
    const o = page.getByRole("dialog");
    await o.getByLabel("Cliente", { exact: true }).fill(customer);
    await o.getByLabel("Item").selectOption({ label: item });
    await o.getByLabel("Quantidade").fill("3");
    await o.getByLabel("Preço unitário (R$)").fill("2000");
    await o.getByRole("button", { name: "Criar encomenda" }).click();
    await expectToast(page, "Encomenda criada");

    const card = () => page.getByTestId("order-card").filter({ hasText: customer });
    await expect(page.getByTestId("orders-ABERTA").getByTestId("order-card").filter({ hasText: customer })).toBeVisible();
    await card().getByRole("button", { name: "Começar produção" }).click();
    await expect(page.getByTestId("orders-PRODUCAO").getByTestId("order-card").filter({ hasText: customer })).toBeVisible();
    await card().getByRole("button", { name: "Marcar pronta" }).click();
    await expect(page.getByTestId("orders-PRONTA").getByTestId("order-card").filter({ hasText: customer })).toContainText("tem no baú");

    await card().getByRole("button", { name: "Entregar" }).click();
    await page.getByRole("dialog").getByLabel("Pagamento").selectOption("DINHEIRO_SUJO");
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar entrega" }).click();
    await expectToast(page, "Encomenda entregue");
    await expect(page.getByTestId("order-done").filter({ hasText: customer })).toContainText("Entregue");

    await page.goto("/bau");
    await expect(page.getByTestId("stock-row").filter({ hasText: item })).toContainText("1");
    await expect(page.getByTestId("vault-move").filter({ hasText: `Pagamento da encomenda de ${customer}` })).toContainText("R$ 6.000");
  });
});

test.describe("punições", () => {
  test.use(as("gerente"));

  test("advertência, alerta de 3, expulsão tira o acesso e revogar devolve", async ({ page }) => {
    const name = `Alvo ${uid()}`;
    await newMember(page, name);
    await page.goto("/punicoes");
    for (const reason of ["Faltou à ação", "Faltou à reunião", "Não bateu meta"]) {
      await page.getByRole("button", { name: "Aplicar punição" }).click();
      const d = page.getByRole("dialog");
      await selectByText(d.getByLabel("Membro"), name);
      await d.getByLabel("Motivo").fill(reason);
      await d.getByRole("button", { name: "Aplicar" }).click();
      await expectToast(page, reason === "Não bateu meta" ? `${name} chegou a 3 advertências ativas` : "Punição aplicada");
    }
    await expect(page.getByTestId("warning-limit")).toContainText(name);

    await page.getByRole("button", { name: "Aplicar punição" }).click();
    const d = page.getByRole("dialog");
    await selectByText(d.getByLabel("Membro"), name);
    await d.getByLabel("Tipo").selectOption("EXPULSAO");
    await expect(d.getByText("perde o acesso ao painel")).toBeVisible();
    await d.getByLabel("Motivo").fill("Quarta falta grave");
    await d.getByRole("button", { name: "Aplicar" }).click();
    await expectToast(page, "Punição aplicada");

    await page.goto("/membros?status=EXPULSO");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

    await page.goto("/punicoes");
    const expulsao = page.getByTestId("punishment").filter({ hasText: "Expulsão" }).filter({ hasText: name });
    await expulsao.getByRole("button", { name: `Revogar punição de ${name}` }).click();
    await page.getByRole("dialog").getByLabel("Motivo da revogação").fill("Foi engano");
    await page.getByRole("dialog").getByRole("button", { name: "Revogar" }).click();
    await expectToast(page, `${name} voltou para a fac`);
  });
});

test.describe("punições (soldado)", () => {
  test.use(as("soldado"));
  test("vê só as próprias e não aplica", async ({ page }) => {
    await page.goto("/punicoes");
    await expect(page.getByRole("button", { name: "Aplicar punição" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Punições" })).toBeVisible();
    await page.goto("/encomendas");
    await expect(page.getByRole("button", { name: "Nova encomenda" })).toHaveCount(0);
    await page.goto("/bau");
    await expect(page.getByRole("button", { name: "Registrar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Entregar farm" })).toBeVisible();
  });
});
