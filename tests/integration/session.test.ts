import { describe, expect, it } from "vitest";
import { getViewer, requireViewer, assertPermission } from "@/lib/session";
import { actAs, db } from "../helpers/db";

describe("sessão e permissões", () => {
  it("sem login → viewer null e assertPermission falha", async () => {
    await actAs(null);
    expect(await getViewer()).toBeNull();
    await expect(assertPermission("painel.ver")).rejects.toThrow("Não autenticado");
  });

  it("sem login → requireViewer manda para /login", async () => {
    await actAs(null);
    await expect(requireViewer()).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
  });

  it("permissões vêm da patente no banco", async () => {
    await actAs("dev-gerente");
    const v = await getViewer();
    expect(v?.member?.rank?.name).toBe("Gerente");
    expect(v?.can("membros.gerenciar")).toBe(true);
    expect(v?.can("hierarquia.gerenciar")).toBe(false);
  });

  it("líder (admin) pode tudo", async () => {
    await actAs("dev-lider");
    const v = await getViewer();
    expect(v?.can("hierarquia.gerenciar")).toBe(true);
    expect(v?.can("auditoria.ver")).toBe(true);
  });

  it("recruta sem painel.ver é mandado para /sem-acesso", async () => {
    await actAs("dev-recruta");
    await expect(requireViewer()).rejects.toMatchObject({ digest: expect.stringContaining("/sem-acesso") });
  });

  it("assertPermission sem a permissão lança erro", async () => {
    await actAs("dev-soldado");
    await expect(assertPermission("regras.editar")).rejects.toThrow("Sem permissão");
  });

  it("membro expulso perde todas as permissões", async () => {
    const user = await actAs("dev-gerente");
    await db.member.update({ where: { userId: user!.id }, data: { status: "EXPULSO" } });
    const v = await getViewer();
    expect(v?.permissions).toEqual([]);
    expect(v?.can("painel.ver")).toBe(false);
  });

  it("usuário sem ficha de membro não tem permissões", async () => {
    const u = await db.user.create({ data: { discordId: "sem-ficha", username: "visitante" } });
    await actAs(u.discordId);
    expect((await getViewer())?.permissions).toEqual([]);
  });

  it("mudar a patente no banco vale na hora", async () => {
    const user = await actAs("dev-soldado");
    const lider = await db.rank.findUniqueOrThrow({ where: { name: "Líder" } });
    await db.member.update({ where: { userId: user!.id }, data: { rankId: lider.id } });
    expect((await getViewer())?.can("admin")).toBe(true);
  });
});
