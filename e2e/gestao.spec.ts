import { expect, test, type Locator, type Page } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

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

  test("meta semanal: gerente entrega (já confere) → progresso aparece", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const item = `Cobre ${uid()}`;
    await newItem(page, item);
    await page.goto("/metas");
    await page.getByRole("button", { name: "Nova meta" }).click();
    await page.getByRole("dialog").getByLabel("Item").selectOption({ label: item });
    await page.getByRole("dialog").getByLabel("Quantidade por semana").fill("50");
    await page.getByRole("dialog").getByRole("button", { name: "Criar meta" }).click();
    await expectToast(page, "Meta criada");

    await page.goto("/bau");
    await page.getByRole("button", { name: "Entregar farm" }).click();
    await page.getByRole("dialog").getByLabel("Item").selectOption({ label: item });
    await page.getByRole("dialog").getByLabel("Quantidade").fill("30");
    await page.getByRole("dialog").getByRole("button", { name: "Entregar" }).click();
    await expectToast(page, "Entrega registrada");
    await expect(page.getByTestId("stock-row").filter({ hasText: item, visible: true })).toContainText("30");

    await page.goto("/metas");
    const mine = page.getByTestId("my-goal").filter({ hasText: item });
    await expect(mine).toContainText("30");
    await expect(mine).toContainText("faltam 20");
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-goals").filter({ visible: true })).toContainText(item);
  });

  test("gráficos: saldo no baú, progresso nas metas e tabela em \"Ver dados\"", async ({ page }) => {
    await page.goto("/bau");
    await page.getByRole("main").getByRole("button", { name: "Registrar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Movimento").selectOption("ENTRADA");
    await d.getByLabel("O quê").selectOption("DINHEIRO_SUJO");
    await d.getByLabel("Valor (R$)").fill("12345");
    await d.getByLabel("Motivo").fill(`Gráfico ${uid()}`);
    await d.getByRole("button", { name: "Registrar" }).click();
    await expectToast(page, "Entrada registrada");

    const saldo = page.getByTestId("chart-bau-saldo").filter({ visible: true });
    await expect(saldo.locator("svg.recharts-surface").first()).toBeVisible();
    await saldo.getByText("Ver dados").click();
    await expect(saldo.getByRole("table")).toBeVisible();
    await expect(saldo.getByRole("columnheader", { name: "Sujo" })).toBeVisible();

    const item = `Ferro ${uid()}`;
    await newItem(page, item);
    await page.goto("/metas");
    await page.getByRole("button", { name: "Nova meta" }).click();
    await page.getByRole("dialog").getByLabel("Item").selectOption({ label: item });
    await page.getByRole("dialog").getByLabel("Quantidade por semana").fill("50");
    await page.getByRole("dialog").getByRole("button", { name: "Criar meta" }).click();
    await expectToast(page, "Meta criada");
    await expect(page.getByTestId("chart-metas-membros").filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId("chart-metas-semanas").filter({ visible: true })).toBeVisible();
  });
});

test.describe("encomendas", () => {
  test.use(as("gerente"));

  test("criar, produzir, marcar pronta e entregar tirando do baú com pagamento", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const s = uid();
    const item = `Colete ${s}`;
    const customer = `Cliente ${s}`;
    await newItem(page, item);
    await page.goto("/bau");
    await page.getByRole("main").getByRole("button", { name: "Registrar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("O quê").selectOption("ITEM");
    await d.getByLabel("Item").selectOption({ label: item });
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
    await expect(page.getByTestId("stock-row").filter({ hasText: item, visible: true })).toContainText("1");
    await expect(page.getByTestId("vault-move").filter({ hasText: `Pagamento da encomenda de ${customer}` })).toContainText("R$ 6.000");
  });
});

test.describe("punições", () => {
  test.use(as("lider"));

  test("advertência, alerta de 3, expulsão tira o acesso e revogar devolve", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
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
    // o diálogo só fecha quando a ação termina (toasts anteriores iguais ainda podem estar na tela)
    await expect(page.getByRole("dialog")).toHaveCount(0);
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
  test("vê só as próprias, não aplica e não acessa a economia", async ({ page }) => {
    await page.goto("/punicoes");
    await expect(page.getByRole("button", { name: "Aplicar punição" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Punições" })).toBeVisible();
    // economia é da gerência
    for (const path of ["/encomendas", "/bau", "/metas"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/sem-acesso/);
    }
  });
});

test.describe("vendas", () => {
  test.use(as("gerente"));

  test("vende para player e para facção, total na hora, estoque cai e cancelar devolve", async ({ page }) => {
    test.slow();
    const s = uid();
    const item = `Pistola ${s}`;
    const faction = `Ballas ${s}`;
    await newItem(page, item);
    await page.goto("/bau");
    await page.getByRole("main").getByRole("button", { name: "Registrar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("O quê").selectOption("ITEM");
    await d.getByLabel("Item").selectOption({ label: item });
    await d.getByLabel("Quantidade").fill("10");
    await d.getByRole("button", { name: "Registrar" }).click();
    await expectToast(page, "Entrada registrada");

    await page.goto("/faccoes");
    await page.getByRole("button", { name: "Nova facção" }).click();
    await page.getByRole("dialog").getByLabel("Nome").fill(faction);
    await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // player
    await page.goto("/vendas");
    await page.getByRole("button", { name: "Nova venda" }).click();
    let v = page.getByRole("dialog");
    await v.getByLabel("Nome do player").fill(`João ${s}`);
    await v.getByLabel("ID (opcional)").fill("5555");
    await v.getByLabel("Item", { exact: true }).selectOption({ label: item });
    await expect(v.getByText("No baú: 10")).toBeVisible();
    await v.getByLabel("Quantidade").fill("3");
    await v.getByLabel("Preço unitário (R$)").fill("2000");
    await expect(v.getByTestId("sale-total")).toContainText("R$ 6.000");
    await v.getByRole("button", { name: "Registrar venda" }).click();
    await expectToast(page, "Venda registrada: R$ 6.000 no baú");

    // facção
    await page.getByRole("button", { name: "Nova venda" }).click();
    v = page.getByRole("dialog");
    await v.getByText("Facção", { exact: true }).click();
    await v.getByRole("combobox", { name: "Facção" }).selectOption({ label: faction });
    await v.getByLabel("Item", { exact: true }).selectOption({ label: item });
    await v.getByLabel("Quantidade").fill("2");
    await v.getByLabel("Preço unitário (R$)").fill("1500");
    await v.getByLabel("Pagamento entrou como").selectOption("DINHEIRO_LIMPO");
    await v.getByRole("button", { name: "Registrar venda" }).click();
    await expectToast(page, "Venda registrada: R$ 3.000 no baú");

    const itens = page.getByTestId("chart-vendas-itens").filter({ visible: true });
    await itens.getByText("Ver dados").click();
    await expect(itens.getByRole("table")).toContainText(item);
    await expect(page.getByTestId("chart-vendas-semanas").filter({ visible: true }).locator("svg.recharts-surface").first()).toBeVisible();

    await page.getByRole("navigation", { name: "Filtrar por comprador" }).getByRole("link", { name: "Facções" }).click();
    await expect(page).toHaveURL(/comprador=faccao/);
    await expect(page.getByTestId("sale-row").filter({ hasText: faction, visible: true })).toBeVisible();
    await expect(page.getByTestId("sale-row").filter({ hasText: `João ${s}`, visible: true })).toHaveCount(0);

    await page.goto("/bau");
    await expect(page.getByTestId("stock-row").filter({ hasText: item, visible: true })).toContainText("5");

    // cancelar a do player devolve 3
    await page.goto("/vendas");
    await page.getByRole("button", { name: `Cancelar venda para João ${s}` }).click();
    await page.getByRole("dialog").getByLabel("Motivo (opcional)").fill("lançado errado");
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar venda" }).click();
    await expectToast(page, "Venda cancelada e desfeita no baú");
    await expect(page.getByTestId("sale-row").filter({ hasText: `João ${s}`, visible: true })).toContainText("Cancelada");
    await page.goto("/bau");
    await expect(page.getByTestId("stock-row").filter({ hasText: item, visible: true })).toContainText("8");
  });
});
