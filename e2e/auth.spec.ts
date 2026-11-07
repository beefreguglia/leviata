import { expect, test } from "@playwright/test";
import { as, loginWithDevButton } from "./helpers";

test.describe("login e acesso", () => {
  test("sem login, qualquer página manda para /login", async ({ page }) => {
    await page.goto("/membros");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Leviata" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Discord" })).toBeVisible();
  });

  test("mostra o erro de quem não está no servidor", async ({ page }) => {
    await page.goto("/login?erro=fora-do-servidor");
    await expect(page.getByText("Você precisa estar no servidor do Discord da Leviata")).toBeVisible();
  });

  test("login de teste lista os usuários do seed", async ({ page }) => {
    await page.goto("/login");
    for (const name of ["Dante Moretti", "Rafa Cardoso", "Nina Torres", "Léo Vieira"]) {
      await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    }
  });

  test("entrar e sair", async ({ page }) => {
    await loginWithDevButton(page, "Nina Torres");
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe("logado", () => {
    test.use(as("lider"));
    test("/login redireciona para o início", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe("recruta", () => {
    test.use(as("recruta"));

    test("entra no painel e lê as regras internas", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/dashboard/);
      await page.goto("/regras/estatuto");
      await expect(page.getByRole("heading", { name: "Regras da Leviatã" })).toBeVisible();
      const conduta = await page.goto("/regras/conduta");
      expect(conduta?.status()).toBe(200);
    });

    test("não vê a economia", async ({ page }) => {
      await page.goto("/bau");
      await expect(page).toHaveURL(/sem-acesso/);
      await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
    });
  });
});

test.describe("sessão de usuário que não existe mais", () => {
  test("cai no login em vez de entrar em loop de redirecionamento", async ({ page, context }) => {
    // cookie válido (assinado) de um usuário que foi apagado do banco
    const { encode } = await import("next-auth/jwt");
    const { parse } = await import("dotenv");
    const { readFileSync } = await import("node:fs");
    const secret = parse(readFileSync(".env.test")).AUTH_SECRET;
    const value = await encode({ token: { uid: "usuario-apagado", sub: "x" }, secret, salt: "authjs.session-token" });
    await context.addCookies([{ name: "authjs.session-token", value, domain: "localhost", path: "/" }]);

    const res = await page.goto("/membros");
    expect(res?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Entrar com Discord" })).toBeVisible();
  });
});
