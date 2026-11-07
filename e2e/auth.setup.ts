import { test as setup } from "@playwright/test";
import { ROLES, loginWithDevButton } from "./helpers";

for (const [role, { name, file }] of Object.entries(ROLES)) {
  setup(`login como ${role}`, async ({ page }) => {
    await loginWithDevButton(page, name);
    await page.context().storageState({ path: file });
  });
}

/** Servidor de teste roda em modo dev: compila cada página na 1ª visita. Aquecer evita timeouts nos testes. */
setup("aquecer páginas", async ({ browser }) => {
  setup.setTimeout(240_000);
  const ctx = await browser.newContext({ storageState: ROLES.lider.file });
  const page = await ctx.newPage();
  for (const path of [
    "/dashboard", "/membros", "/hierarquia", "/ausencias", "/regras/estatuto", "/regras/nova", "/auditoria",
    "/mural", "/lore", "/lore/novo", "/faccoes", "/fabricacao", "/farm", "/farm/novo", "/lives", "/sem-acesso",
    "/mapa", "/perimetros", "/perimetros/novo", "/agenda", "/escalacoes",
  ]) {
    await page.goto(path, { timeout: 120_000 });
  }
  await ctx.close();
});
