import "server-only";
import { db } from "@/lib/db";
import { mapConfigSchema, type MapConfig } from "@/lib/schemas/ops";

/** Configuração do mapa (imagem + tamanho) ou null se ainda não foi enviada. */
export async function getMapConfig(): Promise<MapConfig | null> {
  const row = await db.setting.findUnique({ where: { key: "mapa" } });
  const parsed = mapConfigSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : null;
}
