import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, buildUploadKey, sniffImageType, uploadUrl, validateImage } from "@/lib/images";
import { localDriver } from "@/lib/storage";

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const GIF = new TextEncoder().encode("GIF89a......");
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);

describe("validação de imagens", () => {
  it("reconhece o tipo pelos bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPG)).toBe("image/jpeg");
    expect(sniffImageType(GIF)).toBe("image/gif");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("recusa arquivo que não é imagem (mesmo que se chame .png)", () => {
    expect(validateImage(new TextEncoder().encode("<script>alert(1)</script>"))).toEqual({
      ok: false,
      error: "Formato não suportado (use PNG, JPG, WEBP ou GIF)",
    });
    expect(validateImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")).ok).toBe(false);
  });

  it("recusa vazio e acima de 8 MB", () => {
    expect(validateImage(new Uint8Array())).toEqual({ ok: false, error: "Arquivo vazio" });
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG);
    expect(validateImage(big)).toEqual({ ok: false, error: "Imagem muito grande (máximo 8 MB)" });
  });

  it("monta a chave por ano/mês com a extensão certa", () => {
    expect(buildUploadKey("image/jpeg", new Date("2026-03-05T12:00:00Z"), "abc")).toBe("2026/03/abc.jpg");
    expect(uploadUrl("x1")).toBe("/api/uploads/x1");
  });
});

describe("storage local", () => {
  let dir = "";
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("grava, lê e apaga", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "leviata-"));
    const s = localDriver(dir);
    await s.put("2026/11/a.png", Buffer.from(PNG), "image/png");
    expect(new Uint8Array((await s.get("2026/11/a.png"))!)).toEqual(PNG);
    await s.delete("2026/11/a.png");
    expect(await s.get("2026/11/a.png")).toBeNull();
  });

  it("bloqueia caminhos fora da pasta (path traversal)", async () => {
    const s = localDriver(dir || tmpdir());
    await expect(s.put("../../etc/passwd", Buffer.from("x"), "text/plain")).rejects.toThrow("Caminho de arquivo inválido");
    await expect(s.get("../segredo")).rejects.toThrow("Caminho de arquivo inválido");
  });
});
