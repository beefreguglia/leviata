import { z } from "zod";

export const ruleSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto"),
  content: z.string().trim().min(1, "Escreva o conteúdo"),
  order: z.coerce.number().int().default(0),
  isPublic: z.boolean(),
});

export function parseRuleForm(fd: FormData) {
  return ruleSchema.parse({
    title: fd.get("title"),
    content: fd.get("content"),
    order: fd.get("order") || 0,
    isPublic: fd.get("isPublic") === "on",
  });
}

/** "Regras de Ação!" → "regras-de-acao" */
export function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "regra"
  );
}
