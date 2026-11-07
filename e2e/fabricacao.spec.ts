import { expect, test, type Page } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

async function newItem(page: Page, name: string) {
  await page.getByRole("button", { name: "Novo item" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Cadastrar" }).click();
  await expectToast(page, `${name} cadastrado`);
}

async function newRecipe(page: Page, output: string, inputs: [string, number][], qty = 1) {
  await page.getByRole("button", { name: "Nova receita" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Produz").selectOption({ label: output });
  await d.getByLabel("Quantidade", { exact: true }).fill(String(qty));
  for (const [i, [item, n]] of inputs.entries()) {
    if (i > 0) await d.getByRole("button", { name: "Adicionar insumo" }).click();
    await d.getByLabel(`Insumo ${i + 1}`, { exact: true }).selectOption({ label: item });
    await d.getByLabel(`Quantidade do insumo ${i + 1}`).fill(String(n));
  }
  await d.getByRole("button", { name: "Salvar receita" }).click();
}

test.describe("fabricação", () => {
  test.use(as("gerente"));

  test("itens, receitas encadeadas e calculadora até a matéria-prima", async ({ page }) => {
    const s = uid();
    const [metal, peca, pistola] = [`Metal ${s}`, `Peça ${s}`, `Pistola ${s}`];
    await page.goto("/fabricacao");
    for (const n of [metal, peca, pistola]) await newItem(page, n);

    await newRecipe(page, peca, [[metal, 3]]);
    await expectToast(page, `Receita de ${peca} salva`);
    await newRecipe(page, pistola, [[metal, 8], [peca, 2]]);
    await expectToast(page, `Receita de ${pistola} salva`);
    await expect(page.getByTestId("recipe").filter({ hasText: pistola })).toContainText(`2 ${peca}`);

    const calc = page.getByTestId("calculator");
    await calc.getByLabel("Quero fabricar").selectOption({ label: pistola });
    await calc.getByLabel("Quantidade").fill("3");
    await expect(calc.getByTestId("calc-raw")).toContainText(metal);
    await expect(calc.getByTestId("calc-raw")).toContainText("42");
    await expect(calc.getByTestId("calc-steps")).toContainText(`${peca} × 6 rodadas`);

    await calc.getByLabel(/Abrir até a matéria-prima/).uncheck();
    await expect(calc.getByTestId("calc-raw")).toContainText("24");
    await expect(calc.getByTestId("calc-raw")).toContainText(peca);

    // ciclo: Metal ← Pistola
    await newRecipe(page, metal, [[pistola, 1]]);
    await expectToast(page, /Receita circular/);
  });
});

test.describe("fabricação (soldado)", () => {
  test.use(as("soldado"));
  test("usa a calculadora, mas não edita", async ({ page }) => {
    await page.goto("/fabricacao");
    await expect(page.getByRole("heading", { name: "Fabricação" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova receita" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo item" })).toHaveCount(0);
  });
});

test.describe("calculadora rápida", () => {
  test.use(as("soldado"));

  test("materiais de uma fabricação × meta, o que falta e quanto dá pra fazer agora", async ({ page }) => {
    await page.goto("/fabricacao");
    const c = page.getByTestId("quick-calc");
    await c.getByRole("button", { name: "Limpar" }).click();
    await c.getByLabel("Quero fazer").fill("25");
    await c.getByLabel("Cada fabricação rende").fill("10");
    await c.getByLabel("Material 1", { exact: true }).fill("Pólvora");
    await c.getByLabel("Quantidade do material 1").fill("20");
    await c.getByLabel("Já tenho do material 1").fill("45");
    await c.getByLabel("Material 2", { exact: true }).fill("Cápsula");
    await c.getByLabel("Quantidade do material 2").fill("10");

    await expect(c).toContainText("3 fabricações");
    await expect(c).toContainText("sobram 5");
    const result = c.getByTestId("quick-calc-result");
    await expect(result.getByRole("listitem").filter({ hasText: "Pólvora" })).toContainText("60");
    await expect(result.getByRole("listitem").filter({ hasText: "Pólvora" })).toContainText("faltam 15");
    await expect(result.getByRole("listitem").filter({ hasText: "Cápsula" })).toContainText("30");
    // cápsula sem "já tenho" = 0 → limita tudo
    await expect(c.getByTestId("quick-calc-now")).toContainText("dá pra fazer 0 agora");
    await expect(c.getByTestId("quick-calc-now")).toContainText("Cápsula");

    await c.getByRole("button", { name: "Adicionar material" }).click();
    await expect(c.getByLabel("Material 3", { exact: true })).toBeVisible();

    // continua lá depois de recarregar
    await page.reload();
    await expect(page.getByTestId("quick-calc").getByLabel("Material 1", { exact: true })).toHaveValue("Pólvora");
  });
});
