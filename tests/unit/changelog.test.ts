import { describe, expect, it } from "vitest";
import { CHANGELOG, changelogEmbed, pendingAnnouncements } from "@/lib/changelog";

describe("novidades", () => {
  it("ids únicos, datas válidas e a mais nova primeiro", () => {
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length);
    for (const e of CHANGELOG) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("pendentes = ainda não anunciadas, na ordem (mais nova primeiro)", () => {
    const list = [
      { id: "c", date: "2026-11-09", title: "C", items: [] },
      { id: "b", date: "2026-11-08", title: "B", items: [] },
      { id: "a", date: "2026-11-07", title: "A", items: [] },
    ];
    expect(pendingAnnouncements(list, ["a"]).map((e) => e.id)).toEqual(["c", "b"]);
    expect(pendingAnnouncements(list, ["a", "b", "c"])).toEqual([]);
  });

  it("embed com itens e link para a página", () => {
    const e = changelogEmbed({ id: "x", date: "2026-11-07", title: "Vendas", items: ["Um", "Dois"] }, "https://leviata.vercel.app/");
    expect(e.title).toBe("🆕 Vendas");
    expect(e.description).toBe("• Um\n• Dois\n\n[Ver todas as novidades](https://leviata.vercel.app/novidades)");
  });
});
