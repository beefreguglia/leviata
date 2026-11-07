import { expect, test, type Page } from "@playwright/test";
import { FIXTURE, ROLES, as, expectImageLoaded, expectToast, uid, uploadImages } from "./helpers";

/** "YYYY-MM-DDTHH:mm" daqui a N horas (Brasília). */
function inHours(h: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(Date.now() + h * 3600_000));
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

async function createPerimeter(page: Page, name: string) {
  await page.goto("/perimetros/novo");
  await page.getByLabel("Título").fill(name);
  await uploadImages(page, "Enviar imagem", [FIXTURE.map]);
  await expect(page.getByRole("button", { name: "Remover imagem" })).toBeVisible();
  await page.getByRole("button", { name: "Criar perímetro" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test.describe("perímetros, agenda e escalação", () => {
  test.use(as("gerente"));

  test("perímetro (título + imagem) → agendar ação → presença → montar e salvar escalação → publicar → relatório indisponível no futuro", async ({ page }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const s = uid();
    const name = `Fleeca fundos ${s}`;
    await createPerimeter(page, name);
    await expectImageLoaded(page.getByRole("img", { name: `Vista de cima: ${name}` }));

    // agendar a partir do perímetro: abre o formulário já com ele
    await page.getByRole("link", { name: "Agendar ação" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Perímetro (para ações)")).toHaveValue(/.+/);
    await d.getByLabel("Título").fill(`Ação ${s}`);
    await d.getByLabel("Começa").fill(inHours(26));
    await d.getByLabel("Local").fill("Porto");
    await d.getByRole("button", { name: "Agendar" }).click();
    await expect(page.getByRole("heading", { name: `Ação ${s}` })).toBeVisible();

    // presença
    await page.getByRole("group", { name: "Minha presença" }).getByRole("button", { name: "Vou", exact: true }).click();
    await expectToast(page, "Presença confirmada");
    await expect(page.getByTestId("attendance-VOU")).toContainText("Rafa Cardoso");

    // o evento mostra a vista de cima do perímetro
    await expectImageLoaded(page.getByRole("img", { name: `Vista de cima: ${name}` }));

    // escalação montada à mão
    while ((await page.getByTestId("lineup-row").count()) < 2) await page.getByRole("button", { name: "Adicionar vaga" }).click();
    await expect(page.getByTestId("lineup-row")).toHaveCount(2);
    await page.getByLabel("Função da vaga 1").fill("Piloto");
    await page.getByLabel("Membro da vaga 1").selectOption({ label: "Rafa Cardoso (vou)" });
    await page.getByLabel("Veículo da vaga 1").fill("Sultan RS");
    await page.getByLabel("Função da vaga 2").fill("Hacker");
    await page.getByLabel("Membro da vaga 2").selectOption({ label: "Nina Torres" });
    await page.getByRole("button", { name: "Salvar escalação" }).click();
    await expectToast(page, "Escalação salva");
    await expect(page.getByTestId("my-slot")).toContainText("Piloto");

    await page.getByRole("button", { name: "Publicar no Discord" }).click();
    await expectToast(page, /Escalação publicada/);

    // relatório só depois de começar
    await expect(page.getByText("O relatório é feito depois que o evento começar.")).toBeVisible();

    // aparece em Escalações e na agenda
    await page.goto("/escalacoes");
    await expect(page.getByTestId("my-lineup").filter({ hasText: `Ação ${s}` })).toContainText("Piloto");
    await page.goto("/agenda");
    await expect(page.getByTestId("upcoming-event").filter({ hasText: `Ação ${s}` })).toContainText("Vou");
  });

  test("membro ausente aparece bloqueado na escalação", async ({ page, browser }) => {
    test.slow(); // fluxo longo: mais tempo quando a suíte inteira roda
    const s = uid();
    // Nina avisa ausência de hoje até amanhã+2
    const nina = await (await browser.newContext({ storageState: ROLES.soldado.file })).newPage();
    await nina.goto("/ausencias");
    await nina.getByRole("button", { name: "Avisar ausência" }).click();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const later = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 3 * 86400_000));
    await nina.getByRole("dialog").getByLabel("Saio em").fill(today);
    await nina.getByRole("dialog").getByLabel("Volto em").fill(later);
    await nina.getByRole("dialog").getByLabel("Motivo").fill(`Viagem ${s}`);
    await nina.getByRole("dialog").getByRole("button", { name: "Enviar aviso" }).click();
    await expect(nina.locator("[data-sonner-toast]").filter({ hasText: "Aviso enviado para a liderança" })).toBeVisible();

    await page.goto("/agenda");
    await page.getByRole("button", { name: "Novo evento" }).click();
    await page.getByRole("dialog").getByLabel("Título").fill(`Corrida ${s}`);
    await page.getByRole("dialog").getByLabel("Tipo").selectOption("CORRIDA");
    await page.getByRole("dialog").getByLabel("Começa").fill(inHours(30));
    await page.getByRole("dialog").getByRole("button", { name: "Agendar" }).click();
    await expect(page.getByRole("heading", { name: `Corrida ${s}` })).toBeVisible();

    const option = page.getByLabel("Membro da vaga 1").locator("option", { hasText: "Nina Torres" });
    await expect(option).toHaveText(/ausente/);
    await expect(option).toBeDisabled();
  });

  test("calendário navega entre meses", async ({ page }) => {
    await page.goto("/agenda?mes=2027-01");
    await expect(page.getByTestId("calendar-month")).toHaveText(/janeiro 2027/i);
    await page.getByRole("link", { name: "Próximo mês" }).click();
    await expect(page.getByTestId("calendar-month")).toHaveText(/fevereiro 2027/i);
    await page.getByRole("link", { name: "Mês anterior" }).click();
    await expect(page.getByTestId("calendar-month")).toHaveText(/janeiro 2027/i);
    await page.getByRole("link", { name: "Mês anterior" }).click();
    await expect(page.getByTestId("calendar-month")).toHaveText(/dezembro 2026/i);
  });
});

test.describe("operações (soldado)", () => {
  test.use(as("soldado"));
  test("vê agenda, perímetros e escalações; não cria", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("button", { name: "Novo evento" })).toHaveCount(0);
    await page.goto("/perimetros");
    await expect(page.getByRole("link", { name: "Novo perímetro" })).toHaveCount(0);
    await page.goto("/perimetros/novo");
    await expect(page).toHaveURL(/sem-acesso/);
    await page.goto("/escalacoes");
    await expect(page.getByRole("heading", { name: "Escalações", exact: true })).toBeVisible();
  });
});
