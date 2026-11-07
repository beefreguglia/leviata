import "server-only";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { buildUploadKey, validateImage } from "@/lib/images";

/** Valida, guarda no storage e registra no banco. */
export async function saveImageUpload(file: File, uploaderId: string | null) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateImage(bytes);
  if (!check.ok) throw new Error(check.error);

  const key = buildUploadKey(check.mime);
  await getStorage().put(key, Buffer.from(bytes), check.mime);
  return db.upload.create({
    data: { key, name: file.name.slice(0, 200) || "imagem", mime: check.mime, size: bytes.length, uploaderId },
  });
}

/** Garante que os ids enviados num formulário existem (descarta os inválidos). */
export async function existingUploadIds(ids: string[]) {
  if (!ids.length) return [];
  const found = await db.upload.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const ok = new Set(found.map((u) => u.id));
  return ids.filter((id) => ok.has(id));
}
