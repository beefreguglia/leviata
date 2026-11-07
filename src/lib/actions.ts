import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Executa a lógica de uma Server Action e converte erros em mensagem amigável. */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn();
    return { ok: true, message: message ?? undefined };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Dados inválidos" };
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Algo deu errado" };
  }
}

/** Lê um FormData como objeto simples (para validar com zod). */
export function formToObject(fd: FormData) {
  const obj: Record<string, string | string[]> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value !== "string") continue;
    const prev = obj[key];
    if (prev === undefined) obj[key] = value;
    else obj[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return obj;
}
