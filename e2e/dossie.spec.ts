import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("dossiê (liderança)", () => {
  test.use(as("lider"));

  test("cria ficha, adiciona placa e vínculo, busca pela placa e apaga", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const s = uid();
    const name = `Tony ${s}`;
    const other = `Mia ${s}`;
    const plate = `P${s}`.toUpperCase();

    await page.goto("/dossie");
    for (const person of [other, name]) {
      await page.getByRole("button", { name: "Nova ficha" }).click();
      await page.getByRole("dialog").getByLabel("Nome").fill(person);
      await page.getByRole("dialog").getByRole("button", { name: "Criar ficha" }).click();
      await expectToast(page, `Ficha de ${person} criada`);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await page.getByTestId("dossier-row").filter({ hasText: name, visible: true }).click();
    // primeira visita à ficha compila a rota no servidor de teste
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Veículo" }).click();
    await page.getByRole("dialog").getByLabel("Placa").fill(plate.toLowerCase());
    await page.getByRole("dialog").getByRole("button", { name: "Adicionar" }).click();
    await expectToast(page, `Placa ${plate} adicionada`);
    await expect(page.getByTestId("dossier-vehicle").filter({ visible: true })).toContainText(plate);

    await page.getByRole("button", { name: "Vínculo" }).click();
    await page.getByRole("dialog").getByLabel("Pessoa").selectOption({ label: other });
    await page.getByRole("dialog").getByLabel("Qual é o vínculo").fill("irmã");
    await page.getByRole("dialog").getByRole("button", { name: "Adicionar" }).click();
    await expectToast(page, "Vínculo adicionado");
    await expect(page.getByTestId("dossier-link").filter({ visible: true })).toContainText(other);

    await page.goto("/dossie");
    await page.getByRole("searchbox", { name: "Buscar no dossiê" }).or(page.getByLabel("Buscar no dossiê")).fill(plate);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(new RegExp(`q=${plate}`));
    const rows = page.getByTestId("dossier-row").filter({ visible: true });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(name);

    await rows.click();
    await page.getByRole("button", { name: `Apagar ${name}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Apagar" }).click();
    await expect(page).toHaveURL(/\/dossie$/);
  });

  test("radar abre para a liderança", async ({ page }) => {
    await page.goto("/radar");
    await expect(page.getByRole("heading", { name: "Radar de inatividade" })).toBeVisible();
  });
});

test.describe("acesso restrito (soldado)", () => {
  test.use(as("soldado"));

  test("não vê no menu e é barrado no dossiê e no radar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Dossiê" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Radar de inatividade" })).toHaveCount(0);
    for (const path of ["/dossie", "/radar"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/sem-acesso/);
    }
  });
});
