import { expect, test } from "@playwright/test";
import { as, expectToast, uid } from "./helpers";

test.describe("ao vivo", () => {
  test.use(as("soldado"));

  test("cadastrar o próprio canal pelo link e remover", async ({ page }) => {
    const handle = `nina${uid()}`;
    await page.goto("/lives");
    await expect(page.getByText("Ninguém ao vivo agora")).toBeVisible();
    await page.getByLabel("Plataforma").selectOption("KICK");
    await page.getByLabel("Canal").fill(`https://kick.com/${handle}`);
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expectToast(page, /Canal cadastrado/);
    const mine = page.locator("section", { hasText: "Meus canais" });
    await expect(mine.getByRole("link", { name: handle })).toHaveAttribute("href", `https://kick.com/${handle}`);

    await mine.getByRole("button", { name: `Remover canal ${handle}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remover" }).click();
    await expectToast(page, "Canal removido");
    await expect(mine.getByRole("link", { name: handle })).toHaveCount(0);
  });

  test("canal inválido mostra erro", async ({ page }) => {
    await page.goto("/lives");
    await page.getByLabel("Plataforma").selectOption("YOUTUBE");
    await page.getByLabel("Canal").fill("@leviata");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expectToast(page, /ID do canal/);
  });

  test("soldado não vê 'Atualizar agora'", async ({ page }) => {
    await page.goto("/lives");
    await expect(page.getByRole("button", { name: "Atualizar agora" })).toHaveCount(0);
  });
});

test.describe("ao vivo (gerência)", () => {
  test.use(as("gerente"));
  test("gerência tem o botão de atualizar", async ({ page }) => {
    await page.goto("/lives");
    await expect(page.getByRole("button", { name: "Atualizar agora" })).toBeVisible();
  });
});
