import { describe, expect, it } from "vitest";
import { endOfDayBRT, fmtAgo, fmtDate, fmtDateTime, startOfDayBRT, toDateInputBRT } from "@/lib/dates";

describe("datas no fuso de Brasília", () => {
  it("startOfDayBRT = 00:00 de Brasília (03:00 UTC)", () => {
    expect(startOfDayBRT("2026-11-06").toISOString()).toBe("2026-11-06T03:00:00.000Z");
  });

  it("endOfDayBRT = 23:59:59.999 de Brasília (02:59 UTC do dia seguinte)", () => {
    expect(endOfDayBRT("2026-11-06").toISOString()).toBe("2026-11-07T02:59:59.999Z");
  });

  it("toDateInputBRT usa a data de Brasília, não a UTC", () => {
    // 01:00 UTC do dia 7 ainda é dia 6 em Brasília
    expect(toDateInputBRT(new Date("2026-11-07T01:00:00Z"))).toBe("2026-11-06");
    expect(toDateInputBRT(null)).toBe("");
  });

  it("ida e volta: input → início do dia → input", () => {
    expect(toDateInputBRT(startOfDayBRT("2026-02-28"))).toBe("2026-02-28");
    expect(toDateInputBRT(endOfDayBRT("2026-12-31"))).toBe("2026-12-31");
  });

  it("formata data e hora em pt-BR no horário de Brasília", () => {
    const d = new Date("2026-11-07T01:30:00Z"); // 22:30 do dia 6 em Brasília
    expect(fmtDate(d)).toBe("06/11/2026");
    expect(fmtDateTime(d)).toBe("06/11/2026 22:30");
  });

  it("valores vazios viram traço / 'nunca'", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDateTime(undefined)).toBe("—");
    expect(fmtAgo(null)).toBe("nunca");
  });

  it("fmtAgo fala em português", () => {
    expect(fmtAgo(new Date(Date.now() - 2 * 86400_000))).toMatch(/há 2 dias/);
  });
});
