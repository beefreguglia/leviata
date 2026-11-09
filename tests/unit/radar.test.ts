import { describe, expect, it } from "vitest";
import { inactiveMembers, type RadarActivity } from "@/lib/radar";

const NOW = new Date("2026-11-20T12:00:00-03:00");
const ago = (days: number) => new Date(NOW.getTime() - days * 86400_000);
const member = (id: string, joinedDaysAgo = 60) => ({ id, joinedAt: ago(joinedDaysAgo) });
const run = (members: ReturnType<typeof member>[], activity: [string, RadarActivity][] = [], absent: string[] = []) =>
  inactiveMembers(members, new Map(activity), new Set(absent), NOW).map((r) => [r.member.id, r.days]);

describe("radar de inatividade", () => {
  it("aparece com exatamente 7 dias parado, não com 6", () => {
    expect(run([member("a"), member("b")], [["a", { lastFarm: ago(7) }], ["b", { lastFarm: ago(6) }]])).toEqual([["a", 7]]);
  });
  it("vale a atividade mais recente entre farm e presença", () => {
    expect(run([member("a")], [["a", { lastFarm: ago(30), lastAttendance: ago(1) }]])).toEqual([]);
    expect(run([member("a")], [["a", { lastFarm: ago(9), lastAttendance: ago(20) }]])).toEqual([["a", 9]]);
  });
  it("sem atividade conta desde a entrada, e quem acabou de entrar não aparece", () => {
    expect(run([member("velho", 40), member("novo", 3)])).toEqual([["velho", 40]]);
  });
  it("ausência ativa fica de fora", () => {
    expect(run([member("a")], [], ["a"])).toEqual([]);
  });
  it("ordena do mais parado para o menos", () => {
    expect(run([member("a", 10), member("b", 30)]).map(([id]) => id)).toEqual(["b", "a"]);
  });
  it("devolve a última atividade para mostrar na tela", () => {
    const [row] = inactiveMembers([member("a")], new Map([["a", { lastAttendance: ago(8) }]]), new Set(), NOW);
    expect(row.lastActivity).toEqual(ago(8));
  });
});
