import { expect, test, type Page } from "@playwright/test";
import { as } from "./helpers";

/** Menu lateral (sidebar-08). No desktop é o painel fixo; no celular, a gaveta. */
const sidebar = (page: Page) => page.locator('[data-sidebar="sidebar"]').first();

test.describe("menu lateral", () => {
  test.use(as("lider"));

  test("líder vê os grupos, links do rodapé e o próprio usuário", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = sidebar(page);
    await expect(nav.getByRole("link", { name: "Leviata Cidade dos Anjos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Início" })).toBeVisible();
    for (const group of ["Fac", "Operações", "Economia", "Cidade", "Comunicação"]) {
      await expect(nav.getByRole("button", { name: group })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Regras" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Auditoria" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Menu do usuário" })).toContainText("Dante Moretti");
  });

  test("grupo Fac abre por padrão; outros abrem ao clicar", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = sidebar(page);
    await expect(nav.getByRole("link", { name: "Membros" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Agenda" })).toBeHidden();
    await nav.getByRole("button", { name: "Operações" }).click();
    await expect(nav.getByRole("link", { name: "Agenda" })).toBeVisible();
  });

  test("módulos futuros aparecem desabilitados com a fase", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = sidebar(page);
    await nav.getByRole("button", { name: "Economia" }).click();
    await expect(nav.getByRole("link", { name: /Baú/ })).toHaveCount(0);
    await expect(nav.getByTitle("Chega na Fase 4").first()).toBeVisible();
  });

  test("navega, marca o item ativo e mostra o breadcrumb", async ({ page }) => {
    await page.goto("/dashboard");
    await sidebar(page).getByRole("link", { name: "Hierarquia" }).click();
    await expect(page).toHaveURL(/\/hierarquia$/);
    await expect(sidebar(page).getByRole("link", { name: "Hierarquia" })).toHaveAttribute("data-active", "");
    const crumbs = page.getByRole("navigation", { name: "breadcrumb" });
    await expect(crumbs).toContainText("Fac");
    await expect(crumbs).toContainText("Hierarquia");
  });

  test("recolher o menu e lembrar a escolha", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.locator('[data-slot="sidebar"][data-state="collapsed"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[data-slot="sidebar"][data-state="collapsed"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.locator('[data-slot="sidebar"][data-state="expanded"]')).toHaveCount(1);
  });

  test("header com breadcrumb fica fixo e só o conteúdo do card rola", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("/hierarquia");
    const header = page.locator("header").first();
    const y = (await header.boundingBox())!.y;
    const content = page.locator("#conteudo");
    await content.evaluate((el) => el.scrollTo({ top: 600 }));
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect((await header.boundingBox())!.y).toBe(y);
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toBeInViewport();

    // trocar de página volta o conteúdo ao topo
    await sidebar(page).getByRole("link", { name: "Membros" }).click();
    await expect(page).toHaveURL(/\/membros$/);
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test("menu do usuário leva à própria ficha", async ({ page }) => {
    await page.goto("/dashboard");
    await sidebar(page).getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Minha ficha" }).click();
    await expect(page.getByRole("heading", { name: "Dante Moretti" })).toBeVisible();
  });
});

test.describe("menu por patente", () => {
  test.use(as("soldado"));
  test("soldado não vê Auditoria", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(sidebar(page).getByRole("link", { name: "Regras" })).toBeVisible();
    await expect(sidebar(page).getByRole("link", { name: "Auditoria" })).toHaveCount(0);
  });
});

test.describe("celular", () => {
  test.use({ ...as("soldado"), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("menu abre como gaveta e fecha ao navegar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
    const drawer = page.locator('[data-mobile="true"]');
    // o botão só funciona depois da hidratação: tenta de novo até a gaveta abrir
    await expect(async () => {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await expect(drawer).toBeVisible({ timeout: 1000 });
    }).toPass();
    await drawer.getByRole("link", { name: "Ausências" }).click();
    await expect(page).toHaveURL(/ausencias/);
    await expect(drawer).toBeHidden();
  });

  test("não tem rolagem horizontal", async ({ page }) => {
    for (const path of ["/dashboard", "/membros", "/hierarquia", "/ausencias", "/regras/estatuto"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
