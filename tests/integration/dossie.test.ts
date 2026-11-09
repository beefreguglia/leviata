import { describe, expect, it } from "vitest";
import { addDossierLink, addVehicle, createDossier, deleteDossier, removeDossierLink, removeVehicle, updateDossier } from "@/app/(painel)/dossie/actions";
import { getViewer } from "@/lib/session";
import { updateSector } from "@/app/(painel)/hierarquia/actions";
import { LEVIATA_MANAGEMENTS, LEVIATA_SECTORS } from "../../prisma/leviata-structure";
import { actAs, db, form, memberByName } from "../helpers/db";

const ficha = (o: Record<string, string> = {}) => form({ name: "Tony Sopro", status: "FORAGIDO", threat: "ALTO", ...o });

/** Coloca Nina no setor Vigília, com as permissões oficiais. */
async function ninaNaVigilia() {
  const sector = await db.sector.findUniqueOrThrow({ where: { name: "Vigília" } });
  const nina = await memberByName("Nina Torres");
  await db.member.update({ where: { id: nina.id }, data: { sectorId: sector.id } });
  await actAs("dev-soldado");
}

async function create(name = "Tony Sopro") {
  await createDossier(ficha({ name }));
  return db.dossier.findFirstOrThrow({ where: { name } });
}

describe("dossiê: acesso", () => {
  it("quem não é da investigação não vê nem cria", async () => {
    await actAs("dev-soldado");
    expect((await getViewer())?.can("dossie.gerenciar")).toBe(false);
    expect(await createDossier(ficha())).toEqual({ ok: false, error: "Sem permissão para esta ação" });
    expect(await db.dossier.count()).toBe(0);
  });

  it("gerente comum não entra", async () => {
    await actAs("dev-gerente");
    expect((await createDossier(ficha())).ok).toBe(false);
  });

  it("o setor Vigília cria e edita, porque setor agora soma permissões", async () => {
    await ninaNaVigilia();
    expect((await getViewer())?.can("dossie.gerenciar")).toBe(true);
    expect(await createDossier(ficha())).toEqual({ ok: true, message: "Ficha de Tony Sopro criada" });
  });

  it("G-Investigativa tem acesso; outras gerências não", () => {
    const withAccess = LEVIATA_MANAGEMENTS.filter((g) => g.permissions.includes("dossie.gerenciar")).map((g) => g.name);
    expect(withAccess).toEqual(["G-Investigativa"]);
    expect(LEVIATA_SECTORS.filter((s) => s.permissions?.includes("dossie.gerenciar")).map((s) => s.name)).toEqual(["Vigília"]);
  });

  it("permissão do setor é editável em Hierarquia e sai quando desmarcada", async () => {
    await ninaNaVigilia();
    const sector = await db.sector.findUniqueOrThrow({ where: { name: "Vigília" } });
    await actAs("dev-lider");
    expect((await updateSector(sector.id, form({ name: "Vigília", color: "#8b7cf6", order: "3", discordRoleId: "" }))).ok).toBe(true);
    await actAs("dev-soldado");
    expect((await getViewer())?.can("dossie.gerenciar")).toBe(false);
  });
});

describe("dossiê: fichas", () => {
  it("cria, edita, audita e apaga levando placas e vínculos", async () => {
    await actAs("dev-lider");
    const tony = await create();
    const other = await create("Mia");
    await addVehicle(tony.id, form({ plate: "abc1234" }));
    await addDossierLink(tony.id, form({ toId: other.id, description: "irmã" }));
    expect((await updateDossier(tony.id, ficha({ nickname: "Sopro" }))).ok).toBe(true);
    expect((await db.dossier.findUniqueOrThrow({ where: { id: tony.id } })).nickname).toBe("Sopro");
    expect(await db.auditLog.count({ where: { entity: "Dossier", entityId: tony.id } })).toBeGreaterThanOrEqual(3);

    await deleteDossier(tony.id).catch((e: { digest?: string }) => {
      if (!e.digest?.startsWith("NEXT_REDIRECT")) throw e;
    });
    expect(await db.dossierVehicle.count()).toBe(0);
    expect(await db.dossierLink.count()).toBe(0);
  });

  it("recusa nome curto e facção inexistente", async () => {
    await actAs("dev-lider");
    expect((await createDossier(ficha({ name: "T" }))).ok).toBe(false);
    expect(await createDossier(ficha({ factionId: "nao-existe" }))).toEqual({ ok: false, error: "Facção não encontrada" });
  });

  it("guarda a placa em maiúsculas e remove", async () => {
    await actAs("dev-lider");
    const tony = await create();
    expect(await addVehicle(tony.id, form({ plate: " abc1234 " }))).toEqual({ ok: true, message: "Placa ABC1234 adicionada" });
    const vehicle = await db.dossierVehicle.findFirstOrThrow();
    expect((await removeVehicle(vehicle.id)).ok).toBe(true);
    expect(await db.dossierVehicle.count()).toBe(0);
  });

  it("vínculo não pode ser consigo mesmo nem repetir, em nenhum sentido", async () => {
    await actAs("dev-lider");
    const a = await create("Ana");
    const b = await create("Bia");
    expect(await addDossierLink(a.id, form({ toId: a.id, description: "ela mesma" }))).toEqual({ ok: false, error: "Uma ficha não pode ter vínculo com ela mesma" });
    expect((await addDossierLink(a.id, form({ toId: b.id, description: "sócia" }))).ok).toBe(true);
    expect(await addDossierLink(b.id, form({ toId: a.id, description: "sócia" }))).toEqual({ ok: false, error: "Essas fichas já têm um vínculo" });
    const link = await db.dossierLink.findFirstOrThrow();
    expect((await removeDossierLink(link.id)).ok).toBe(true);
  });
});
