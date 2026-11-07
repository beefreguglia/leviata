import { expect, test, type Page } from "@playwright/test";
import { as } from "./helpers";

/** Todas as páginas do painel no celular (iPhone 14: 390×844) — nada pode vazar para os lados. */
const PAGES = [
  "/dashboard", "/membros", "/hierarquia", "/ausencias", "/punicoes",
  "/agenda", "/escalacoes", "/perimetros", "/mapa",
  "/farm", "/fabricacao", "/bau", "/metas", "/encomendas",
  "/lore", "/faccoes", "/mural", "/mural?aba=flyers", "/lives",
  "/regras/estatuto", "/regras/conduta", "/registro", "/auditoria", "/novidades",
  "/lore/novo", "/perimetros/novo", "/farm/novo", "/regras/nova",
];

/** Elementos que passam da largura da tela (ignorando os que estão dentro de uma área com rolagem horizontal própria). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollsX = (el: Element | null): boolean => {
      for (let p = el?.parentElement; p; p = p.parentElement) {
        // área com rolagem horizontal própria, ou texto truncado com reticências ("truncate"), não conta
        const cs = getComputedStyle(p);
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && p.id !== "conteudo") return true;
        if (cs.textOverflow === "ellipsis") return true;
      }
      return false;
    };
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("#conteudo *, header *"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 && !scrollsX(el)) {
        bad.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(" ").slice(0, 4).join(".")} → ${Math.round(r.right)}px`);
      }
    }
    const content = document.getElementById("conteudo");
    return {
      page: document.documentElement.scrollWidth > vw + 1,
      content: content ? content.scrollWidth > content.clientWidth + 1 : false,
      bad: bad.slice(0, 5),
    };
  });
}

async function check(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("#conteudo h1, #conteudo [role=status]").first()).toBeVisible();
  // espera as animações de entrada assentarem antes de medir
  let r = await overflowing(page);
  await expect
    .poll(async () => {
      r = await overflowing(page);
      return r.page || r.content || r.bad.length > 0;
    }, { timeout: 4000 })
    .toBe(false)
    .catch(() => {});
  if (process.env.MOBILE_SHOTS) await page.waitForTimeout(1200).then(() => page.screenshot({ path: `${process.env.MOBILE_SHOTS}/${path.replace(/[/?=]/g, "_")}.png`, fullPage: true }));
  expect(r.page || r.content || r.bad.length > 0, `${path}: ${r.bad.join(" | ") || "rolagem horizontal"}`).toBe(false);
}

test.describe("celular: nenhuma página vaza para os lados", () => {
  test.use({ ...as("lider"), viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  for (const path of PAGES) {
    test(path, async ({ page }) => {
      await check(page, path);
    });
  }

  for (const [list, prefix] of [["/membros", "/membros/"], ["/agenda", "/agenda/"], ["/lore", "/lore/"], ["/faccoes", "/faccoes/"], ["/farm", "/farm/"], ["/perimetros", "/perimetros/"]] as const) {
    test(`detalhe de ${list}`, async ({ page }) => {
      await page.goto(list);
      await expect(page.locator("#conteudo h1").first()).toBeVisible();
      const links = page.locator(`#conteudo a[href^="${prefix}"]:not([href$="/novo"])`);
      test.skip((await links.count()) === 0, "sem registros no banco de teste");
      await check(page, (await links.first().getAttribute("href"))!);
    });
  }
});
