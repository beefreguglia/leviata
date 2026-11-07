import { afterEach, describe, expect, it } from "vitest";
import { createEvent } from "@/app/(painel)/agenda/actions";
import { createLore } from "@/app/(painel)/lore/actions";
import { createNotice } from "@/app/(painel)/mural/actions";
import { deliverFarm, registerMove } from "@/app/(painel)/bau/actions";
import { createPunishment } from "@/app/(painel)/punicoes/actions";
import { createRule } from "@/app/(painel)/regras/actions";
import { createAbsence, reviewAbsence } from "@/app/(painel)/ausencias/actions";
import { createMember } from "@/app/(painel)/membros/actions";
import { getViewer, requireViewer } from "@/lib/session";
import { actAs, day, db, form, memberByName } from "../helpers/db";

/** true = a ação passou da checagem de permissão (sucesso ou redirect de sucesso). */
async function allowed(p: Promise<unknown>) {
  try {
    const r = (await p) as { ok?: boolean; error?: string } | undefined;
    return !(r && r.ok === false && /permiss|autenticado/i.test(r.error ?? ""));
  } catch (e) {
    const digest = String((e as { digest?: string })?.digest ?? "");
    if (digest.includes("NEXT_REDIRECT")) return !digest.includes("/sem-acesso");
    if (/permiss/i.test(String((e as Error)?.message))) return false;
    throw e;
  }
}

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString().slice(0, 16);

describe("permissões padrão das patentes", () => {
  afterEach(() => {
    delete process.env.BOOTSTRAP_ADMIN_DISCORD_IDS;
  });

  it("gerente cria em operações, economia, cidade e comunicação", async () => {
    await actAs("dev-gerente");
    expect(await allowed(createEvent(form({ title: "Ação", kind: "ACAO", startsAt: inHours(24) })))).toBe(true);
    expect(await allowed(createLore(form({ title: "Origem", content: "x" })))).toBe(true);
    expect(await allowed(createNotice(form({ title: "Aviso", content: "x" })))).toBe(true);
    expect(await allowed(registerMove(form({ kind: "ENTRADA", asset: "DINHEIRO_SUJO", quantity: "100", reason: "Loot" })))).toBe(true);
    await expect(requireViewer("economia.ver")).resolves.toBeTruthy();
  });

  it("gerente NÃO pune, não edita regras, não aprova ausências, não vê auditoria nem cadastra membros", async () => {
    await actAs("dev-soldado");
    await createAbsence(form({ startsAt: day(1), endsAt: day(3), reason: "Viagem" }));
    const absence = await db.absence.findFirstOrThrow();
    const nina = await memberByName("Nina Torres");

    await actAs("dev-gerente");
    expect(await allowed(createPunishment(form({ memberId: nina.id, kind: "ADVERTENCIA", reason: "x" })))).toBe(false);
    expect(await allowed(createRule(form({ title: "Nova", content: "x" })))).toBe(false);
    expect(await allowed(reviewAbsence(absence.id, true))).toBe(false);
    expect(await allowed(createMember(form({ rpName: "Fulano" })))).toBe(false);
    await expect(requireViewer("auditoria.ver")).rejects.toMatchObject({ digest: expect.stringContaining("/sem-acesso") });
  });

  it.each(["dev-soldado", "dev-recruta"])("%s vê o painel, mas não a economia nem cria nada", async (who) => {
    await actAs(who);
    await expect(requireViewer()).resolves.toBeTruthy();
    await expect(requireViewer("economia.ver")).rejects.toMatchObject({ digest: expect.stringContaining("/sem-acesso") });
    const metal = await db.item.create({ data: { name: "Metal" } });
    expect(await allowed(deliverFarm(form({ itemId: metal.id, quantity: "10" })))).toBe(false);
    expect(await allowed(createEvent(form({ title: "Ação", kind: "ACAO", startsAt: inHours(24) })))).toBe(false);
    expect(await allowed(createLore(form({ title: "Origem", content: "x" })))).toBe(false);
  });

  it("desenvolvedor (BOOTSTRAP_ADMIN_DISCORD_IDS) pode tudo, mas continua aparecendo como Recruta", async () => {
    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "dev-recruta";
    await actAs("dev-recruta");
    const v = await getViewer();
    expect(v?.member?.rank?.name).toBe("Recruta");
    expect(v?.can("admin")).toBe(true);
    expect(v?.can("auditoria.ver")).toBe(true);
  });
});
