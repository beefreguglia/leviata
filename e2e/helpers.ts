import { expect, type Page } from "@playwright/test";

export const ROLES = {
  lider: { name: "Dante Moretti", file: "e2e/.auth/lider.json" },
  gerente: { name: "Rafa Cardoso", file: "e2e/.auth/gerente.json" },
  soldado: { name: "Nina Torres", file: "e2e/.auth/soldado.json" },
  recruta: { name: "Léo Vieira", file: "e2e/.auth/recruta.json" },
} as const;

export type Role = keyof typeof ROLES;
export const as = (role: Role) => ({ storageState: ROLES[role].file });

/** Sufixo único para não colidir dados entre testes. */
export const uid = () => Math.random().toString(36).slice(2, 7);

/** "YYYY-MM-DD" daqui a N dias (Brasília). */
export function day(offset: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 86400_000));
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

export async function loginWithDevButton(page: Page, name: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL(/\/(dashboard|regras)/);
}

export const FIXTURE = {
  print: "e2e/fixtures/print.png",
  flyer: "e2e/fixtures/flyer.png",
  notImage: "e2e/fixtures/nao-e-imagem.png",
  map: "e2e/fixtures/mapa.png",
};

/** Envia arquivo(s) pelo campo de imagem (ImageInput) e espera a prévia aparecer. */
export async function uploadImages(scope: Page | import("@playwright/test").Locator, label: string, files: string[]) {
  const input = scope.locator(`input[type="file"][aria-label="${label}"]`);
  await input.setInputFiles(files);
}

/** Garante que uma <img> carregou de verdade (não está quebrada). */
export async function expectImageLoaded(img: import("@playwright/test").Locator) {
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
}
