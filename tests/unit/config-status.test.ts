import { describe, expect, it } from "vitest";
import { configStatus, productionProblems } from "@/lib/config-status";

const full = {
  DATABASE_URL: "postgres://x",
  AUTH_SECRET: "s",
  AUTH_DISCORD_ID: "1",
  AUTH_DISCORD_SECRET: "2",
  DISCORD_GUILD_ID: "3",
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "k",
  NODE_ENV: "production",
};

describe("checagem de configuração de produção", () => {
  it("tudo certo = nenhum problema", () => {
    expect(productionProblems(full)).toEqual([]);
    expect(configStatus(full)).toMatchObject({ storage: "supabase", discordLogin: true, devLoginOn: false });
  });
  it("aponta o que falta", () => {
    expect(productionProblems({ ...full, SUPABASE_URL: "", AUTH_DISCORD_SECRET: "" })).toEqual([
      "Login do Discord incompleto (AUTH_DISCORD_ID, AUTH_DISCORD_SECRET, DISCORD_GUILD_ID)",
      "Sem Supabase Storage: imagens não funcionam na Vercel (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    ]);
  });
  it("login de teste ligado em produção é problema (mesmo que o código já o ignore)", () => {
    expect(productionProblems({ ...full, AUTH_DEV_LOGIN: "true" })).toContain("AUTH_DEV_LOGIN deve ficar vazio em produção");
    expect(configStatus({ ...full, AUTH_DEV_LOGIN: "true" }).devLoginOn).toBe(false);
  });
});
