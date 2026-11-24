"use server";

import { createDiaryEntry } from "@/app/(painel)/diario/actions";
import { createAbsence } from "@/app/(painel)/ausencias/actions";
import { deliverFarm } from "@/app/(painel)/bau/actions";
import { createNotice } from "@/app/(painel)/mural/actions";
import { createEvent } from "@/app/(painel)/agenda/actions";
import type { ActionResult } from "@/lib/actions";
import type { AssistantActionKey } from "./tools";

/**
 * O membro clicou em Confirmar num cartão do assistente. Chama a MESMA ação do formulário da tela,
 * então a permissão, a validação e a auditoria são as de sempre.
 */
const RUN: Record<AssistantActionKey, (fd: FormData) => Promise<ActionResult>> = {
  "diario.registrar": createDiaryEntry,
  "ausencia.avisar": createAbsence,
  "farm.entregar": deliverFarm,
  "mural.publicar": createNotice,
  "agenda.criar": createEvent,
};

export async function confirmAssistantAction(action: AssistantActionKey, fields: Record<string, string>): Promise<ActionResult> {
  const run = RUN[action];
  if (!run) return { ok: false, error: "Ação desconhecida" };
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) if (typeof v === "string") fd.set(k, v);
  return run(fd);
}
