import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { POST as sign } from "@/app/api/uploads/sign/route";
import { POST as finish } from "@/app/api/uploads/finish/route";
import { PNG_BYTES, actAs, db } from "../helpers/db";

const SB = "https://proj.supabase.co";
let stored: Uint8Array<ArrayBuffer> | null = null;
let deleted: string[] = [];
let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  process.env.SUPABASE_URL = SB;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.SUPABASE_BUCKET = "leviata";
  stored = null;
  deleted = [];
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.startsWith(`${SB}/storage/v1/object/upload/sign/leviata/`)) {
      const key = url.split("/upload/sign/leviata/")[1];
      return Response.json({ url: `/object/upload/sign/leviata/${key}?token=tok` });
    }
    if (method === "GET" && url.startsWith(`${SB}/storage/v1/object/leviata/`)) {
      return stored ? new Response(stored) : new Response("not found", { status: 404 });
    }
    if (method === "DELETE") {
      deleted.push(String(init?.body));
      return new Response("[]");
    }
    return new Response("unexpected", { status: 500 });
  });
});
afterEach(() => {
  fetchSpy.mockRestore();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_BUCKET;
});

const json = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("upload direto ao Supabase (produção)", () => {
  it("1) pede link assinado com a service key; 2) confere e registra", async () => {
    await actAs("dev-soldado");
    const res = await sign(json({ type: "image/png", size: 1234 }));
    const plan = await res.json();
    expect(plan.mode).toBe("signed");
    expect(plan.key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    expect(plan.uploadUrl).toBe(`${SB}/storage/v1/object/upload/sign/leviata/${plan.key}?token=tok`);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer service-key");

    stored = PNG_BYTES; // o navegador enviou direto ao Supabase
    const done = await finish(json({ key: plan.key, name: "print.png" }));
    expect(done.status).toBe(201);
    const up = await db.upload.findUniqueOrThrow({ where: { key: plan.key }, include: { uploader: true } });
    expect(up).toMatchObject({ mime: "image/png", size: PNG_BYTES.length });
    expect(up.uploader?.rpName).toBe("Nina Torres");

    // não registra duas vezes
    expect((await finish(json({ key: plan.key, name: "print.png" }))).status).toBe(400);
  });

  it("arquivo que não é imagem é apagado do bucket e recusado", async () => {
    await actAs("dev-soldado");
    const plan = await (await sign(json({ type: "image/png", size: 10 }))).json();
    stored = new Uint8Array(new TextEncoder().encode("<script>alert(1)</script>"));
    const res = await finish(json({ key: plan.key, name: "x.png" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Formato não suportado/);
    expect(deleted[0]).toContain(plan.key);
    expect(await db.upload.count()).toBe(0);
  });

  it("recusa tipo/tamanho na hora de pedir o link e chave forjada na confirmação", async () => {
    await actAs("dev-soldado");
    expect((await sign(json({ type: "image/svg+xml", size: 10 }))).status).toBe(400);
    expect((await sign(json({ type: "image/png", size: 9 * 1024 * 1024 }))).status).toBe(400);
    expect((await finish(json({ key: "../../segredo.png", name: "x" }))).status).toBe(400);
  });

  it("sem login não pede link", async () => {
    await actAs(null);
    expect((await sign(json({ type: "image/png", size: 10 }))).status).toBe(401);
  });

  it("sem Supabase configurado responde modo direto (dev)", async () => {
    delete process.env.SUPABASE_URL;
    await actAs("dev-soldado");
    expect(await (await sign(json({ type: "image/png", size: 10 }))).json()).toEqual({ mode: "direct" });
  });
});
