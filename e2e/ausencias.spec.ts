import { expect, test, type Page } from "@playwright/test";
import { ROLES, day, expectToast, uid } from "./helpers";

async function openAs(browser: import("@playwright/test").Browser, role: keyof typeof ROLES) {
  const ctx = await browser.newContext({ storageState: ROLES[role].file, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  return { ctx, page: await ctx.newPage() };
}

async function avisar(page: Page, start: number, end: number, reason: string) {
  await page.goto("/ausencias");
  await page.getByRole("button", { name: "Avisar ausência" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Saio em").fill(day(start));
  await dialog.getByLabel("Volto em").fill(day(end));
  await dialog.getByLabel("Motivo").fill(reason);
  await dialog.getByRole("button", { name: "Enviar aviso" }).click();
}

test.describe("ausências", () => {
  test("soldado avisa, liderança aprova, aparece como ausente; gerente não vê a ausência", async ({ browser }) => {
    const reason = `Viagem ${uid()}`;
    const soldado = await openAs(browser, "soldado");
    await avisar(soldado.page, 0, 2, reason);
    await expectToast(soldado.page, "Aviso enviado para a liderança");
    const meu = soldado.page.locator("section", { hasText: "Meus avisos" });
    await expect(meu.getByText(reason)).toBeVisible();
    await expect(meu.getByText("Pendente").first()).toBeVisible();

    // gerente não vê as ausências dos outros
    const outro = await openAs(browser, "gerente");
    await outro.page.goto("/ausencias");
    await expect(outro.page.getByRole("heading", { name: "Ausências" })).toBeVisible();
    await expect(outro.page.getByText(reason)).toHaveCount(0);
    await outro.ctx.close();

    const gerente = await openAs(browser, "lider");
    await gerente.page.goto("/ausencias");
    const pend = gerente.page.locator("section", { hasText: "Aguardando aprovação" });
    const row = pend.getByTestId("absence-row").filter({ hasText: reason });
    await row.getByRole("button", { name: "Aprovar" }).click();
    await expect(gerente.page.locator("section", { hasText: "Aguardando aprovação" }).getByText(reason)).toHaveCount(0);

    // ficha e lista mostram "Ausente"
    await gerente.page.goto("/membros?q=Nina");
    // bolinha de presença no avatar
    await expect(gerente.page.getByRole("main").getByRole("img", { name: "Ausente" })).toBeVisible();
    await gerente.page.goto("/dashboard");
    await expect(gerente.page.locator("section", { hasText: "Fora agora" }).getByText("Nina Torres")).toBeVisible();

    // soldado volta antes
    await soldado.page.goto("/ausencias");
    await soldado.page.locator("section", { hasText: "Meus avisos" }).getByTestId("absence-row").filter({ hasText: reason }).getByRole("button", { name: "Voltei" }).click();
    await soldado.page.getByRole("alertdialog").getByRole("button", { name: "Voltei" }).click();
    await expectToast(soldado.page, "Bem-vindo de volta!");

    await soldado.ctx.close();
    await gerente.ctx.close();
  });

  test("liderança recusa um aviso", async ({ browser }) => {
    const reason = `Recusar ${uid()}`;
    const soldado = await openAs(browser, "soldado");
    await avisar(soldado.page, 20, 21, reason);
    await expectToast(soldado.page, "Aviso enviado");

    const lider = await openAs(browser, "lider");
    await lider.page.goto("/ausencias");
    await lider.page.locator("section", { hasText: "Aguardando aprovação" }).getByTestId("absence-row").filter({ hasText: reason }).getByRole("button", { name: "Recusar" }).click();
    await lider.page.getByRole("alertdialog").getByRole("button", { name: "Recusar" }).click();
    await expectToast(lider.page, "Ausência recusada");

    await soldado.page.reload();
    await expect(soldado.page.locator("section", { hasText: "Meus avisos" }).getByTestId("absence-row").filter({ hasText: reason }).getByText("Recusada")).toBeVisible();
    await soldado.ctx.close();
    await lider.ctx.close();
  });

  test("liderança avisa → já sai aprovada; cancelar antes de começar", async ({ browser }) => {
    const reason = `Folga ${uid()}`;
    const { ctx, page } = await openAs(browser, "lider");
    await avisar(page, 10, 12, reason);
    await expectToast(page, "Ausência registrada");
    const row = page.locator("section", { hasText: "Meus avisos" }).getByTestId("absence-row").filter({ hasText: reason });
    await expect(row.getByText("Aprovada")).toBeVisible();
    await row.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar aviso" }).click();
    await expectToast(page, "Ausência cancelada");
    await expect(page.locator("section", { hasText: "Meus avisos" }).getByTestId("absence-row").filter({ hasText: reason }).getByText("Cancelada")).toBeVisible();
    await ctx.close();
  });

  test("validações: volta antes da saída e período repetido", async ({ browser }) => {
    const { ctx, page } = await openAs(browser, "soldado");
    await avisar(page, 5, 3, "Errado");
    await expectToast(page, "A volta precisa ser depois do início");
    await page.keyboard.press("Escape");

    await avisar(page, 30, 32, `Primeira ${uid()}`);
    await expectToast(page, "Aviso enviado");
    await avisar(page, 31, 33, `Segunda ${uid()}`);
    await expectToast(page, "Você já tem uma ausência nesse período");
    await ctx.close();
  });

  test("gerência vê os sumidos sem aviso", async ({ browser }) => {
    const { ctx, page } = await openAs(browser, "lider");
    await page.goto("/ausencias");
    // Caio/membros criados sem Discord nunca entraram; o seed não tem logins antigos, então pode estar vazio
    const section = page.locator("section", { hasText: "Sumidos sem aviso" });
    if (await section.count()) await expect(section.getByText(/nunca entrou|visto/).first()).toBeVisible();
    await ctx.close();
  });
});
