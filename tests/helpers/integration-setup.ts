import { beforeEach, vi } from "vitest";

// Sessão controlada pelos testes: actAs("dev-lider") / actAs(null)
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  devLoginEnabled: true,
}));

// revalidatePath só funciona dentro do Next
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

beforeEach(async () => {
  const { resetAndSeed } = await import("./db");
  await resetAndSeed();
  vi.clearAllMocks();
  // erros esperados (validação/permissão) são logados por runAction; não poluir a saída
  vi.spyOn(console, "error").mockImplementation(() => {});
});
