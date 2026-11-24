import { describe, expect, it } from "vitest";
import { consumeQuota, fakeCompletion, QuotaError, runAssistant, systemPrompt } from "@/lib/ai/assistant";
import { toolsFor } from "@/lib/ai/tools";
import { confirmAssistantAction } from "@/lib/ai/actions";
import type { CompleteFn } from "@/lib/ai/providers";
import { getViewer } from "@/lib/session";
import { actAs, db, setRankPerms } from "../helpers/db";

async function viewerAs(discordId: string) {
  await actAs(discordId);
  const v = await getViewer();
  if (!v) throw new Error("sem viewer");
  return v;
}

/** Modelo roteirizado: devolve as respostas na ordem e guarda o que recebeu. */
function scripted(...replies: Awaited<ReturnType<CompleteFn>>["message"][]) {
  const seen: Parameters<CompleteFn>[] = [];
  const fn: CompleteFn = async (messages, tools) => {
    seen.push([structuredClone(messages), tools]);
    return { message: replies.shift() ?? { role: "assistant", content: "fim" }, endpoint: { id: "t", label: "Teste" } };
  };
  return { fn, seen };
}
const toolCall = (name: string, args: object) => ({
  role: "assistant" as const,
  content: null,
  tool_calls: [{ id: `c-${name}`, type: "function" as const, function: { name, arguments: JSON.stringify(args) } }],
});

describe("assistente", () => {
  it("as ferramentas e o guia seguem as permissões do membro", async () => {
    await setRankPerms("Recruta", ["painel.ver", "assistente.ver", "agenda.ver"]);
    const recruta = await viewerAs("dev-recruta");
    expect(toolsFor(recruta).map((t) => t.name)).toEqual(["ver_agenda"]);
    const prompt = systemPrompt(recruta, "/agenda");
    expect(prompt).toContain("Agenda (/agenda)");
    expect(prompt).not.toContain("Baú");
    expect(prompt).toContain("página /agenda");

    const gerente = await viewerAs("dev-gerente");
    const names = toolsFor(gerente).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["registrar_diario", "entregar_farm", "publicar_aviso", "agendar_evento"]));
  });

  it("consulta roda na hora; ação só vira cartão e nada é salvo", async () => {
    const v = await viewerAs("dev-soldado");
    const { fn, seen } = scripted(
      toolCall("ver_diario", {}),
      toolCall("registrar_diario", { titulo: "Perseguição na ponte", tipo: "POLICIA", detalhes: "Escapamos" }),
      { role: "assistant", content: "Preparei, confirme abaixo." },
    );
    const r = await runAssistant(v, [{ role: "user", content: "registra no diário" }], fn);
    expect(r.reply).toBe("Preparei, confirme abaixo.");
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0]).toMatchObject({ action: "diario.registrar", fields: { title: "Perseguição na ponte", kind: "POLICIA", content: "Escapamos" } });
    expect(await db.diaryEntry.count()).toBe(0);
    // o resultado da consulta voltou para o modelo
    expect(seen[1][0].at(-1)).toMatchObject({ role: "tool" });

    // confirmar = a mesma ação do formulário
    expect(await confirmAssistantAction(r.pending[0].action, r.pending[0].fields)).toEqual({ ok: true, message: "Registrado no diário" });
    expect(await db.diaryEntry.findFirstOrThrow()).toMatchObject({ title: "Perseguição na ponte", kind: "POLICIA" });
  });

  it("ferramenta fora da permissão ou com argumento errado volta como erro para o modelo", async () => {
    const v = await viewerAs("dev-soldado");
    const { fn, seen } = scripted(toolCall("publicar_aviso", { titulo: "Oi", texto: "x" }), toolCall("registrar_diario", { titulo: "x" }), {
      role: "assistant",
      content: "ok",
    });
    const r = await runAssistant(v, [{ role: "user", content: "publica um aviso" }], fn);
    expect(r.pending).toHaveLength(0);
    expect(seen[1][0].at(-1)?.content).toContain("não está disponível");
    expect(seen[2][0].at(-1)?.content).toContain("Argumentos inválidos");
  });

  it("confirmar sem permissão é barrado pela própria ação", async () => {
    await setRankPerms("Recruta", ["painel.ver", "assistente.ver"]);
    await actAs("dev-recruta");
    const r = await confirmAssistantAction("diario.registrar", { title: "Forjado", kind: "OUTRO", happenedAt: "2026-01-01T10:00" });
    expect(r.ok).toBe(false);
    expect(await db.diaryEntry.count()).toBe(0);
  });

  it("modelo de teste prepara o diário", async () => {
    const v = await viewerAs("dev-soldado");
    const r = await runAssistant(v, [{ role: "user", content: "anota no diário" }], fakeCompletion);
    expect(r.pending[0]?.action).toBe("diario.registrar");
  });

  it("limite diário por usuário", async () => {
    const v = await viewerAs("dev-soldado");
    expect(await consumeQuota(v.user.id, 2)).toBe(1);
    expect(await consumeQuota(v.user.id, 2)).toBe(0);
    await expect(consumeQuota(v.user.id, 2)).rejects.toBeInstanceOf(QuotaError);
  });
});
