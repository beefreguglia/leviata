import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/uploads/route";
import { GET } from "@/app/api/uploads/[id]/route";
import { PNG_BYTES, actAs, db, setRankPerms } from "../helpers/db";

function uploadRequest(bytes: Uint8Array<ArrayBuffer>, name = "print.png") {
  const fd = new FormData();
  fd.append("file", new File([bytes], name, { type: "image/png" }));
  return new Request("http://localhost/api/uploads", { method: "POST", body: fd });
}
const get = (id: string) => GET(new Request(`http://localhost/api/uploads/${id}`), { params: Promise.resolve({ id }) });

describe("upload de imagens", () => {
  it("membro envia, fica registrado e consegue baixar", async () => {
    await actAs("dev-soldado");
    const res = await POST(uploadRequest(PNG_BYTES));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.url).toBe(`/api/uploads/${json.id}`);

    const row = await db.upload.findUniqueOrThrow({ where: { id: json.id }, include: { uploader: true } });
    expect(row).toMatchObject({ mime: "image/png", size: PNG_BYTES.length, name: "print.png" });
    expect(row.uploader?.rpName).toBe("Nina Torres");

    const file = await get(json.id);
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(PNG_BYTES);
  });

  it("arquivo que não é imagem é recusado (mesmo com nome .png)", async () => {
    await actAs("dev-soldado");
    const res = await POST(uploadRequest(new Uint8Array(new Uint8Array(new TextEncoder().encode("<html>oi</html>"))), "virus.png"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Formato não suportado/);
    expect(await db.upload.count()).toBe(0);
  });

  it("sem login não envia nem baixa", async () => {
    await actAs("dev-soldado");
    const { id } = await (await POST(uploadRequest(PNG_BYTES))).json();
    await actAs(null);
    expect((await POST(uploadRequest(PNG_BYTES))).status).toBe(401);
    expect((await get(id)).status).toBe(401);
  });

  it("recruta (sem painel) não envia, mas consegue ver imagens", async () => {
    await setRankPerms("Recruta", []); // patente configurada sem acesso
    await actAs("dev-soldado");
    const { id } = await (await POST(uploadRequest(PNG_BYTES))).json();
    await actAs("dev-recruta");
    expect((await POST(uploadRequest(PNG_BYTES))).status).toBe(403);
    expect((await get(id)).status).toBe(200);
  });

  it("id inexistente dá 404", async () => {
    await actAs("dev-soldado");
    expect((await get("nao-existe")).status).toBe(404);
  });
});
