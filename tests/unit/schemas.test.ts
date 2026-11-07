import { describe, expect, it } from "vitest";
import { memberInputToData, memberSchema } from "@/lib/schemas/member";
import { parseRankForm } from "@/lib/schemas/rank";
import { parseRuleForm, slugify } from "@/lib/schemas/rule";
import { parseAbsenceForm } from "@/lib/schemas/absence";

const fd = (data: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(data)) for (const i of Array.isArray(v) ? v : [v]) f.append(k, i);
  return f;
};

describe("memberSchema", () => {
  it("aceita ficha mínima e aplica status ATIVO", () => {
    expect(memberSchema.parse({ rpName: "Dante" })).toMatchObject({ rpName: "Dante", status: "ATIVO" });
  });

  it("recusa nome curto", () => {
    expect(() => memberSchema.parse({ rpName: " a " })).toThrow("Nome RP muito curto");
  });

  it("campos opcionais vazios viram null", () => {
    const parsed = memberSchema.parse({ rpName: "Dante", passport: "  ", phone: "" });
    expect(parsed.passport).toBeNull();
    expect(parsed.phone).toBeNull();
  });

  it("recusa status inválido", () => {
    expect(() => memberSchema.parse({ rpName: "Dante", status: "CHEFE" })).toThrow();
  });

  it("converte datas para o início do dia em Brasília", () => {
    const data = memberInputToData(memberSchema.parse({ rpName: "Dante", joinedAt: "2026-01-10", birthday: "" }));
    expect(data.joinedAt?.toISOString()).toBe("2026-01-10T03:00:00.000Z");
    expect(data.birthday).toBeNull();
  });

  it("sem data de entrada não sobrescreve (undefined)", () => {
    expect(memberInputToData(memberSchema.parse({ rpName: "Dante" })).joinedAt).toBeUndefined();
  });
});

describe("parseRankForm", () => {
  const base = { name: "Gerente", order: "3", color: "#00d9ff", discordRoleId: "" };

  it("lê o formulário e converte a ordem para número", () => {
    expect(parseRankForm(fd(base))).toEqual({ name: "Gerente", order: 3, color: "#00d9ff", discordRoleId: null, permissions: [] });
  });

  it("descarta permissões desconhecidas e duplicadas", () => {
    const r = parseRankForm(fd({ ...base, permissions: ["painel.ver", "hackear", "painel.ver", "admin"] }));
    expect(r.permissions).toEqual(["painel.ver", "admin"]);
  });

  it("ID do cargo precisa ser numérico", () => {
    expect(() => parseRankForm(fd({ ...base, discordRoleId: "abc" }))).toThrow("só números");
    expect(parseRankForm(fd({ ...base, discordRoleId: " 123 " })).discordRoleId).toBe("123");
  });

  it("valida cor e ordem", () => {
    expect(() => parseRankForm(fd({ ...base, color: "ciano" }))).toThrow("Cor inválida");
    expect(() => parseRankForm(fd({ ...base, order: "0" }))).toThrow("Ordem");
  });
});

describe("regras", () => {
  it("slugify remove acentos e símbolos", () => {
    expect(slugify("Regras de Ação!")).toBe("regras-de-acao");
    expect(slugify("  Conduta & Punições  ")).toBe("conduta-punicoes");
    expect(slugify("!!!")).toBe("regra");
    expect(slugify("a".repeat(100))).toHaveLength(60);
  });

  it("parseRuleForm lê checkbox de público", () => {
    expect(parseRuleForm(fd({ title: "Estatuto", content: "x", isPublic: "on" }))).toEqual({
      title: "Estatuto",
      content: "x",
      order: 0,
      isPublic: true,
    });
    expect(parseRuleForm(fd({ title: "Estatuto", content: "x" })).isPublic).toBe(false);
  });

  it("exige título e conteúdo", () => {
    expect(() => parseRuleForm(fd({ title: "E", content: "x" }))).toThrow("Título muito curto");
    expect(() => parseRuleForm(fd({ title: "Estatuto", content: "   " }))).toThrow("Escreva o conteúdo");
  });
});

describe("parseAbsenceForm", () => {
  it("aceita período válido", () => {
    expect(parseAbsenceForm(fd({ startsAt: "2026-11-06", endsAt: "2026-11-08", reason: "Viagem" }))).toEqual({
      startsAt: "2026-11-06",
      endsAt: "2026-11-08",
      reason: "Viagem",
    });
  });

  it("volta antes do início é recusada", () => {
    expect(() => parseAbsenceForm(fd({ startsAt: "2026-11-08", endsAt: "2026-11-06", reason: "Viagem" }))).toThrow(
      "A volta precisa ser depois do início",
    );
  });

  it("exige datas e motivo", () => {
    expect(() => parseAbsenceForm(fd({ endsAt: "2026-11-08", reason: "Viagem" }))).toThrow("Informe a data de início");
    expect(() => parseAbsenceForm(fd({ startsAt: "2026-11-06", reason: "Viagem" }))).toThrow("Informe a data de volta");
    expect(() => parseAbsenceForm(fd({ startsAt: "2026-11-06", endsAt: "2026-11-08", reason: "x" }))).toThrow("motivo");
  });
});

import { RANK_PALETTE, suggestRankColor } from "@/lib/rank-colors";

describe("cores das patentes", () => {
  it("topo é o ciano da Leviata e a base é azul escuro", () => {
    expect(suggestRankColor(1)).toBe("#00d9ff");
    expect(suggestRankColor(5)).toBe(RANK_PALETTE[4]);
  });

  it("patentes abaixo da 5ª repetem o azul mais escuro; valores inválidos são limitados", () => {
    expect(suggestRankColor(9)).toBe(RANK_PALETTE[4]);
    expect(suggestRankColor(0)).toBe(RANK_PALETTE[0]);
  });

  it("vai escurecendo do ciano para o azul (menos verde a cada passo)", () => {
    const green = RANK_PALETTE.map((hex) => parseInt(hex.slice(3, 5), 16));
    for (let i = 1; i < green.length; i++) expect(green[i]).toBeLessThan(green[i - 1]);
  });
});
