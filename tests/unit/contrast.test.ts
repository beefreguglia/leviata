import { describe, expect, it } from "vitest";
import { luminance, textToneOn } from "@/lib/contrast";

describe("contraste da letra sobre a cor da facção", () => {
  it("calcula a luminância", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000000")).toBe(0);
  });

  it("fundo escuro → letra clara; fundo claro → letra escura", () => {
    expect(textToneOn("#000000")).toBe("light");
    expect(textToneOn("#8e44ad")).toBe("light"); // roxo dos Ballas
    expect(textToneOn("#1a237e")).toBe("light");
    expect(textToneOn("#ffffff")).toBe("dark");
    expect(textToneOn("#f1c40f")).toBe("dark"); // amarelo
    expect(textToneOn("#c9a227")).toBe("dark"); // dourado
  });

  it("duas cores: escolhe pelo lado pior", () => {
    expect(textToneOn("#000000", "#c0392b")).toBe("light"); // preto e vermelho
    expect(textToneOn("#ffffff", "#f1c40f")).toBe("dark"); // branco e amarelo
  });
});
