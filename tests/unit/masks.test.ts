import { describe, expect, it } from "vitest";
import { digits, formatMoney, formatPhone } from "@/lib/masks";

describe("máscara de dinheiro", () => {
  it("separa milhares com ponto e ignora o que não é número", () => {
    expect(formatMoney("1500000")).toBe("1.500.000");
    expect(formatMoney("R$ 2.500")).toBe("2.500");
    expect(formatMoney(999)).toBe("999");
    expect(formatMoney("000120")).toBe("120");
    expect(formatMoney("0")).toBe("0");
    expect(formatMoney("")).toBe("");
    expect(formatMoney(null)).toBe("");
  });
});

describe("máscara de telefone", () => {
  it("formata (055) 123-456 enquanto digita", () => {
    expect(formatPhone("0")).toBe("(0");
    expect(formatPhone("055")).toBe("(055");
    expect(formatPhone("0551")).toBe("(055) 1");
    expect(formatPhone("055123")).toBe("(055) 123");
    expect(formatPhone("0551234")).toBe("(055) 123-4");
    expect(formatPhone("055123456")).toBe("(055) 123-456");
    expect(formatPhone("0551234569999")).toBe("(055) 123-456");
    expect(formatPhone("(055) 123-456")).toBe("(055) 123-456");
    expect(formatPhone("")).toBe("");
  });
  it("digits", () => expect(digits("(055) 1a2")).toBe("05512"));
});
