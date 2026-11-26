import { describe, expect, it } from "vitest";
import { fuzzyFilter, matchScore, normalize, tokensWhere } from "@/lib/search";

describe("busca por similaridade", () => {
  it("ignora maiúsculas e acentos", () => {
    expect(normalize("  Polícia CIVIL ")).toBe("policia civil");
    expect(matchScore("policia", "Polícia")).toBeGreaterThan(0);
  });

  it("parte da palavra já encontra", () => {
    expect(matchScore("bal", "Ballas")).toBeGreaterThan(0);
    expect(matchScore("llas", "Ballas")).toBeGreaterThan(0);
    expect(matchScore("xyz", "Ballas")).toBe(0);
  });

  it("várias palavras em qualquer ordem", () => {
    expect(matchScore("torres nina", "Nina Torres")).toBeGreaterThan(0);
    expect(matchScore("nina silva", "Nina Torres")).toBe(0);
  });

  it("aceita abreviação (letras na ordem)", () => {
    expect(matchScore("blls", "Ballas")).toBeGreaterThan(0);
    expect(matchScore("sllb", "Ballas")).toBe(0);
  });

  it("ordena: igual > começa com > começo de palavra > pedaço > abreviação", () => {
    const items = ["Família Leone", "Ballas", "Grove Ballas", "Bala de borracha", "Big Balls"];
    expect(fuzzyFilter(items, "ballas", (x) => x)).toEqual(["Ballas", "Grove Ballas"]);
    expect(fuzzyFilter(items, "blls", (x) => x)).toEqual(["Ballas", "Grove Ballas", "Big Balls"]);
    expect(fuzzyFilter(items, "bal", (x) => x)[0]).toBe("Ballas");
    expect(fuzzyFilter(items, "", (x) => x, 2)).toEqual(["Família Leone", "Ballas"]);
  });

  it("monta a busca do banco palavra por palavra", () => {
    expect(tokensWhere("  nina  torres ", (t) => [{ name: t }])).toEqual({ AND: [{ OR: [{ name: "nina" }] }, { OR: [{ name: "torres" }] }] });
    expect(tokensWhere("", (t) => [{ name: t }])).toEqual({});
  });
});
