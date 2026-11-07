import { execFileSync } from "node:child_process";

/** Recria o banco de teste do zero antes da suíte e2e. */
export default function globalSetup() {
  execFileSync("npx", ["tsx", "e2e/reset-db.ts"], { stdio: "inherit" });
}
