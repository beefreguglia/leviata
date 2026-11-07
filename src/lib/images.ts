/** Validação de imagens enviadas (sem dependências de servidor — testável). */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ImageMime = keyof typeof IMAGE_TYPES;

/** Descobre o tipo real pelos primeiros bytes (não confia na extensão nem no navegador). */
export function sniffImageType(bytes: Uint8Array): ImageMime | null {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && String.fromCharCode(...b.slice(0, 6)).match(/^GIF8[79]a$/)) return "image/gif";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return "image/webp";
  return null;
}

export function validateImage(bytes: Uint8Array): { ok: true; mime: ImageMime } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Arquivo vazio" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "Imagem muito grande (máximo 8 MB)" };
  const mime = sniffImageType(bytes);
  if (!mime) return { ok: false, error: "Formato não suportado (use PNG, JPG, WEBP ou GIF)" };
  return { ok: true, mime };
}

/** Caminho no storage: 2026/11/<aleatório>.png */
export function buildUploadKey(mime: ImageMime, now = new Date(), random = crypto.randomUUID()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${random}.${IMAGE_TYPES[mime]}`;
}

export const uploadUrl = (id: string) => `/api/uploads/${id}`;
