import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { parse } from "dotenv";
import { readFileSync } from "node:fs";

const testEnv = parse(readFileSync(".env.test"));
// `server-only` lança erro fora do Next; nos testes vira um módulo vazio
const serverOnly = fileURLToPath(new URL("./tests/helpers/empty.ts", import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { "server-only": serverOnly } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: testEnv,
          setupFiles: ["tests/helpers/integration-setup.ts"],
          // todos os arquivos usam o mesmo banco de teste → um processo, uma conexão
          // (o Postgres local do Prisma Dev não lida bem com várias conexões trocando)
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          isolate: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/**/actions.ts"],
      exclude: ["src/generated/**"],
    },
  },
});
