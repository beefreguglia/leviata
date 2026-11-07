import { describe, expect, it } from "vitest";
import { isDiscordIssuer, stripDiscordIssuer } from "@/lib/oauth-issuer";

const base = "https://leviata.vercel.app/api/auth/callback/discord?code=abc&state=xyz";

describe("iss do Discord no callback do OAuth", () => {
  it("remove o iss do Discord e mantém o resto", () => {
    const out = stripDiscordIssuer(`${base}&iss=${encodeURIComponent("https://discord.com")}`)!;
    const u = new URL(out);
    expect(u.searchParams.has("iss")).toBe(false);
    expect(u.searchParams.get("code")).toBe("abc");
    expect(u.searchParams.get("state")).toBe("xyz");
  });

  it("não mexe sem iss, em outra rota ou com emissor de fora", () => {
    expect(stripDiscordIssuer(base)).toBeNull();
    expect(stripDiscordIssuer("https://x.app/api/auth/session?iss=https://discord.com")).toBeNull();
    expect(stripDiscordIssuer(`${base}&iss=${encodeURIComponent("https://evil.example")}`)).toBeNull();
  });

  it("reconhece só https em discord.com", () => {
    expect(isDiscordIssuer("https://discord.com")).toBe(true);
    expect(isDiscordIssuer("https://discord.com/")).toBe(true);
    expect(isDiscordIssuer("http://discord.com")).toBe(false);
    expect(isDiscordIssuer("https://discord.com.evil.io")).toBe(false);
    expect(isDiscordIssuer("lixo")).toBe(false);
  });
});
