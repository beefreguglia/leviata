import { describe, expect, it } from "vitest";
import {
  parseFactionEventForm, parseFactionForm, parseFarmGuideForm, parseFlyerForm, parseItemForm, parseLoreForm,
  parseNoticeForm, parseRecipeForm, parseTags, yieldPerHour,
} from "@/lib/schemas/content";

const fd = (data: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) for (const i of Array.isArray(v) ? v : [v]) f.append(k, i);
  return f;
};

describe("tags", () => {
  it("normaliza, remove repetidas e vazias", () => {
    expect(parseTags(" Tiroteio, vespucci ,, TIROTEIO,  grove   street ")).toEqual(["tiroteio", "vespucci", "grove street"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("lore", () => {
  it("lê o formulário completo", () => {
    const r = parseLoreForm(fd({ title: "A queda", content: "texto", category: "EVENTO", happenedAt: "2026-10-01", tags: "a, b", isPinned: "on", coverId: "c1", summary: "" }));
    expect(r).toMatchObject({ title: "A queda", category: "EVENTO", tags: ["a", "b"], isPinned: true, coverId: "c1", summary: null });
    expect(r.happenedAt?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
  it("valida título, conteúdo e categoria", () => {
    expect(() => parseLoreForm(fd({ title: "ab", content: "x" }))).toThrow("Título muito curto");
    expect(() => parseLoreForm(fd({ title: "Título", content: " " }))).toThrow("Escreva o conteúdo");
    expect(() => parseLoreForm(fd({ title: "Título", content: "x", category: "FOFOCA" }))).toThrow("Categoria inválida");
  });
});

describe("facções", () => {
  it("lê a ficha e aplica padrões", () => {
    expect(parseFactionForm(fd({ name: "Ballas", color: "#8e44ad", relation: "INIMIGA", isActive: "on" }))).toMatchObject({
      name: "Ballas", relation: "INIMIGA", isActive: true, tag: null, logoId: null,
    });
  });
  it("valida cor e relação", () => {
    expect(() => parseFactionForm(fd({ name: "X1", color: "roxo" }))).toThrow("Cor inválida");
    expect(() => parseFactionForm(fd({ name: "X1", color: "#000000", relation: "AMIGA" }))).toThrow("Relação inválida");
  });
  it("evento de histórico", () => {
    expect(parseFactionEventForm(fd({ kind: "ACORDO", title: "Trégua no porto" }))).toMatchObject({ kind: "ACORDO", happenedAt: null });
    expect(() => parseFactionEventForm(fd({ kind: "RELACAO", title: "manual" }))).toThrow("Tipo inválido");
  });
});

describe("farm e itens", () => {
  it("guia com números opcionais e imagens", () => {
    const r = parseFarmGuideForm(fd({ title: "Cobre", location: "Pedreira", howTo: "x", amountPerRun: "12", minutesPerRun: "", risk: "MEDIO", imageIds: ["a", "b"] }));
    expect(r).toMatchObject({ amountPerRun: 12, minutesPerRun: null, risk: "MEDIO", imageIds: ["a", "b"], itemId: null });
  });
  it("números inválidos dão erro", () => {
    expect(() => parseFarmGuideForm(fd({ title: "Cobre", location: "P1", howTo: "x", amountPerRun: "-3" }))).toThrow("inteiro");
    expect(() => parseFarmGuideForm(fd({ title: "Cobre", location: "P1", howTo: "x", amountPerRun: "1.5" }))).toThrow("inteiro");
  });
  it("rendimento por hora", () => {
    expect(yieldPerHour(12, 6)).toBe(120);
    expect(yieldPerHour(40, 15)).toBe(160);
    expect(yieldPerHour(null, 5)).toBeNull();
  });
  it("item", () => {
    expect(parseItemForm(fd({ name: "Metal", unit: "" }))).toEqual({ name: "Metal", unit: "un", isIllegal: false });
  });
});

describe("receitas", () => {
  const base = { outputItemId: "pistola", outputQty: "1", inputItemId: ["metal", "peca", ""], inputQty: ["8", "2", "1"] };
  it("lê insumos ignorando linhas vazias", () => {
    expect(parseRecipeForm(fd(base)).inputs).toEqual([{ itemId: "metal", quantity: 8 }, { itemId: "peca", quantity: 2 }]);
  });
  it("não deixa o produto ser insumo dele mesmo", () => {
    expect(() => parseRecipeForm(fd({ ...base, inputItemId: ["pistola"], inputQty: ["1"] }))).toThrow("não pode ser insumo dele mesmo");
  });
  it("não deixa insumo repetido nem vazio", () => {
    expect(() => parseRecipeForm(fd({ ...base, inputItemId: ["metal", "metal"], inputQty: ["1", "2"] }))).toThrow("Insumo repetido");
    expect(() => parseRecipeForm(fd({ ...base, inputItemId: [""], inputQty: ["1"] }))).toThrow("pelo menos um insumo");
    expect(() => parseRecipeForm(fd({ ...base, inputItemId: ["metal"], inputQty: ["0"] }))).toThrow("1 ou mais");
  });
});

describe("mural", () => {
  it("aviso", () => {
    expect(parseNoticeForm(fd({ title: "Reunião", content: "sábado", priority: "URGENTE", isPinned: "on", notifyDiscord: "on" }))).toMatchObject({
      priority: "URGENTE", isPinned: true, notifyDiscord: true, expiresAt: null,
    });
  });
  it("flyer exige imagem", () => {
    expect(() => parseFlyerForm(fd({ title: "Corrida" }))).toThrow("Envie a imagem do flyer");
    expect(parseFlyerForm(fd({ title: "Corrida", imageId: "img1" }))).toMatchObject({ imageId: "img1" });
  });
});
