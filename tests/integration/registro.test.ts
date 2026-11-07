import { afterEach, describe, expect, it } from "vitest";
import { saveMyRegistration } from "@/app/(painel)/registro/actions";
import { discordSignIn } from "@/lib/discord-sync";
import { actAs, db, form, memberByName } from "../helpers/db";

const dados = { rpName: "Tony Vargas", phone: "(055) 123-456", passport: "4321" };

describe("registro do membro", () => {
  afterEach(() => {
    delete process.env.BOOTSTRAP_ADMIN_DISCORD_IDS;
  });

  it("membro novo (sem patente) se registra: nome, número e ID", async () => {
    await discordSignIn({ accessToken: "t", guildId: undefined, profile: { id: "777", username: "tony" } });
    await actAs("777");
    expect(await saveMyRegistration(form(dados))).toEqual({ ok: true, message: "Registro feito — bem-vindo à Leviatã" });
    const m = await db.member.findFirstOrThrow({ where: { user: { discordId: "777" } } });
    expect(m).toMatchObject({ ...dados, rankId: null });
    expect(await db.auditLog.findFirst({ where: { action: "member.register", entityId: m.id } })).toBeTruthy();
    // nome pode mudar; número e ID, depois de preenchidos, não
    expect(await saveMyRegistration(form({ ...dados, rpName: "Tony V." }))).toEqual({ ok: true, message: "Registro atualizado" });
    expect(await saveMyRegistration(form({ ...dados, phone: "(055) 999-999" }))).toEqual({
      ok: false,
      error: "Número e ID já cadastrados só podem ser alterados pelo dev do painel",
    });
  });

  it("valida número e ID", async () => {
    await actAs("dev-soldado");
    expect(await saveMyRegistration(form({ ...dados, phone: "abc" }))).toMatchObject({ ok: false, error: "Número inválido — ex.: (055) 000-000" });
    expect(await saveMyRegistration(form({ ...dados, passport: "12a" }))).toMatchObject({ ok: false, error: "ID inválido — só números" });
    expect(await saveMyRegistration(form({ ...dados, rpName: "" }))).toMatchObject({ ok: false, error: "Informe seu nome na cidade" });
  });

  it("ID de outra pessoa é recusado no primeiro registro", async () => {
    await discordSignIn({ accessToken: "t", guildId: undefined, profile: { id: "778", username: "ze" } });
    await actAs("778");
    expect(await saveMyRegistration(form({ ...dados, passport: "1001" }))).toEqual({
      ok: false,
      error: "O ID 1001 já está na ficha de Dante Moretti — fale com a liderança",
    });
    expect((await saveMyRegistration(form(dados))).ok).toBe(true);
  });

  it("dev pode trocar o próprio número e ID", async () => {
    process.env.BOOTSTRAP_ADMIN_DISCORD_IDS = "dev-soldado";
    await actAs("dev-soldado");
    expect((await saveMyRegistration(form({ ...dados, passport: "1187" }))).ok).toBe(true);
    expect(await db.member.findFirstOrThrow({ where: { user: { discordId: "dev-soldado" } } })).toMatchObject({ phone: dados.phone });
  });

  it("expulso ou sem login não registra", async () => {
    await actAs(null);
    expect((await saveMyRegistration(form(dados))).ok).toBe(false);
    const nina = await memberByName("Nina Torres");
    await db.member.update({ where: { id: nina.id }, data: { status: "EXPULSO" } });
    await actAs("dev-soldado");
    expect(await saveMyRegistration(form(dados))).toEqual({ ok: false, error: "Sem permissão para esta ação" });
  });
});
