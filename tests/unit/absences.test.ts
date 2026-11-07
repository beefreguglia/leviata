import { describe, expect, it } from "vitest";
import { COUNTING_STATUSES, activeAbsenceWhere } from "@/lib/absences";

describe("activeAbsenceWhere", () => {
  it("considera pendentes e aprovadas que cobrem o momento atual", () => {
    const now = new Date("2026-11-06T15:00:00Z");
    expect(activeAbsenceWhere(now)).toEqual({
      status: { in: ["PENDENTE", "APROVADA"] },
      startsAt: { lte: now },
      endsAt: { gte: now },
    });
  });

  it("recusadas e canceladas não contam como ausente", () => {
    expect(COUNTING_STATUSES).not.toContain("RECUSADA");
    expect(COUNTING_STATUSES).not.toContain("CANCELADA");
  });
});
