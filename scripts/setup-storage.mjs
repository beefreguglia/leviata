// Cria (ou atualiza) o bucket PRIVADO de imagens no Supabase Storage.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run setup:storage
import "dotenv/config";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "leviata";
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const config = {
  id: bucket,
  name: bucket,
  public: false, // as imagens só saem pelo painel, para quem está logado
  file_size_limit: 8 * 1024 * 1024,
  allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
};
const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };

const exists = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers });
const res = exists.ok
  ? await fetch(`${url}/storage/v1/bucket/${bucket}`, { method: "PUT", headers, body: JSON.stringify(config) })
  : await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body: JSON.stringify(config) });
if (!res.ok) {
  console.error(`Falhou (${res.status}):`, await res.text());
  process.exit(1);
}
console.log(`Bucket "${bucket}" ${exists.ok ? "atualizado" : "criado"} (privado, até 8 MB, só imagens).`);
