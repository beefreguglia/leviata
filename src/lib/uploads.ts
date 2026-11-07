import "server-only";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, buildUploadKey, validateImage, type ImageMime } from "@/lib/images";

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

/** Chave válida gerada por nós: 2026/11/<uuid>.png */
const KEY_RE = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

/** Passo 1 (produção): pede um link assinado para o navegador enviar direto ao storage. */
export async function startSignedUpload(claimedType: string, size: number) {
  if (!(claimedType in IMAGE_TYPES)) throw new Error("Formato não suportado (use PNG, JPG, WEBP ou GIF)");
  if (size > MAX_IMAGE_BYTES) throw new Error("Imagem muito grande (máximo 8 MB)");
  const storage = getStorage();
  if (!storage.createSignedUpload) return { mode: "direct" as const };
  const key = buildUploadKey(claimedType as ImageMime);
  return { mode: "signed" as const, key, uploadUrl: await storage.createSignedUpload(key) };
}

/** Passo 2: confere o arquivo que chegou no storage e registra. Arquivo inválido é apagado. */
export async function finishSignedUpload(key: string, name: string, uploaderId: string | null) {
  if (!KEY_RE.test(key)) throw new Error("Upload inválido");
  if (await db.upload.findUnique({ where: { key } })) throw new Error("Upload já registrado");
  const storage = getStorage();
  const data = await storage.get(key);
  if (!data) throw new Error("O arquivo não chegou ao storage");
  const check = validateImage(new Uint8Array(data));
  if (!check.ok) {
    await storage.delete(key);
    throw new Error(check.error);
  }
  return db.upload.create({
    data: { key, name: name.slice(0, 200) || "imagem", mime: check.mime, size: data.length, uploaderId },
  });
}
