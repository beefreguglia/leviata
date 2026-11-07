"use client";

/* eslint-disable @next/next/no-img-element -- prévia de imagens privadas */
import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, XIcon } from "@/components/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_BYTES, uploadUrl } from "@/lib/images";

type Item = { id: string; name: string };
type Uploaded = { id: string; url: string; name: string };

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Falha no upload");
  return json;
}

/**
 * Envia um arquivo. Em produção (Supabase) vai direto ao storage por link assinado
 * — não passa pelo limite de 4,5 MB da Vercel — e depois o painel confere e registra.
 * Em desenvolvimento envia para /api/uploads.
 */
async function sendFile(file: File): Promise<Uploaded> {
  const plan = await readJson(
    await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: file.type, size: file.size }),
    }),
  );
  if (plan.mode === "signed") {
    const put = await fetch(plan.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("O storage recusou o arquivo");
    return readJson(
      await fetch("/api/uploads/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: plan.key, name: file.name }),
      }),
    );
  }
  const body = new FormData();
  body.append("file", file);
  return readJson(await fetch("/api/uploads", { method: "POST", body }));
}

/**
 * Campo de imagem: envia na hora para /api/uploads e guarda só os ids
 * em inputs escondidos (name=...). Aceita arrastar e soltar.
 */
export function ImageInput({
  name,
  multiple = false,
  defaultIds = [],
  label = "Adicionar imagem",
  max = 8,
  onChange,
}: {
  name: string;
  multiple?: boolean;
  defaultIds?: string[];
  label?: string;
  max?: number;
  /** chamado com os ids sempre que a lista muda */
  onChange?: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<Item[]>(defaultIds.map((id) => ({ id, name: "" })));
  const [busy, setBusy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const limit = multiple ? max : 1;

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).slice(0, Math.max(0, limit - items.length) || (multiple ? 0 : 1));
    if (!list.length) return toast.error(`Máximo de ${limit} ${limit === 1 ? "imagem" : "imagens"}`);
    for (const file of list) {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: imagem muito grande (máximo 8 MB)`);
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const json = await sendFile(file);
        setItems((prev) => (multiple ? [...prev, { id: json.id, name: json.name }] : [{ id: json.id, name: json.name }]));
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "falha no upload"}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  const canAdd = items.length < limit || !multiple;
  const idsKey = items.map((i) => i.id).join(",");
  useEffect(() => {
    onChange?.(idsKey ? idsKey.split(",") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando a lista de ids muda
  }, [idsKey]);

  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <input key={it.id} type="hidden" name={name} value={it.id} />
      ))}

      {items.length > 0 && (
        <ul className={cn("grid gap-3", multiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
          {items.map((it) => (
            <li key={it.id} className="group relative overflow-hidden rounded-md bg-input">
              <img src={uploadUrl(it.id)} alt={it.name || "Imagem enviada"} className="aspect-video w-full object-cover" />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-grey-950/80 text-grey-100 backdrop-blur transition-colors hover:bg-danger-base"
                aria-label="Remover imagem"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-sm transition-colors",
            dragging ? "border-primary bg-cyan-low text-cyan-light" : "border-grey-600 text-muted-foreground hover:border-grey-500 hover:text-grey-200",
          )}
        >
          {busy > 0 ? <Loader2Icon className="size-6 animate-spin" /> : <ImagePlusIcon className="size-6" />}
          <span className="font-medium">{busy > 0 ? "Enviando…" : items.length && !multiple ? "Trocar imagem" : label}</span>
          <span className="text-xs">Arraste aqui ou clique · PNG, JPG, WEBP ou GIF até 8 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
