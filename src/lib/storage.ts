import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Onde os arquivos ficam guardados. Local em dev; Supabase Storage em produção. */
export interface StorageDriver {
  readonly name: "local" | "supabase";
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

function safeLocalPath(root: string, key: string) {
  const full = path.resolve(root, key);
  if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error("Caminho de arquivo inválido");
  return full;
}

export function localDriver(root = process.env.UPLOAD_DIR || ".uploads"): StorageDriver {
  return {
    name: "local",
    async put(key, data) {
      const file = safeLocalPath(root, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    },
    async get(key) {
      try {
        return await readFile(safeLocalPath(root, key));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async delete(key) {
      await rm(safeLocalPath(root, key), { force: true });
    },
  };
}

/** Supabase Storage via API REST (bucket privado; o painel serve os arquivos para quem está logado). */
export function supabaseDriver(opts: { url: string; serviceKey: string; bucket: string }): StorageDriver {
  const base = `${opts.url.replace(/\/$/, "")}/storage/v1/object/${opts.bucket}`;
  const headers = { Authorization: `Bearer ${opts.serviceKey}`, apikey: opts.serviceKey };
  return {
    name: "supabase",
    async put(key, data, mime) {
      const res = await fetch(`${base}/${key}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
        body: new Uint8Array(data),
      });
      if (!res.ok) throw new Error(`Supabase Storage recusou o upload (${res.status})`);
    },
    async get(key) {
      const res = await fetch(`${base}/${key}`, { headers, cache: "no-store" });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`Supabase Storage falhou ao ler (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    async delete(key) {
      await fetch(base, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
    },
  };
}

export function getStorage(): StorageDriver {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseDriver({ url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_ROLE_KEY, bucket: SUPABASE_BUCKET || "leviata" });
  }
  return localDriver();
}
