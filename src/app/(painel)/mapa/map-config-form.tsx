"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ImageInput } from "@/components/forms/image-input";
import { uploadUrl } from "@/lib/images";
import type { ActionResult } from "@/lib/actions";

/** Envia a imagem do mapa e descobre o tamanho dela (em pixels) no navegador. */
export function MapConfigForm({
  action,
  current,
  onDone,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  current?: { imageId: string } | null;
  onDone?: () => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  function measure(ids: string[]) {
    setSize(null);
    if (!ids[0] || ids[0] === current?.imageId) return;
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = uploadUrl(ids[0]);
  }

  return (
    <ActionForm action={action} onSuccess={onDone} className="flex flex-col gap-4">
      <ImageInput name="imageId" label="Imagem do mapa" onChange={measure} />
      <p className="text-xs text-muted-foreground">
        Use a imagem do mapa da cidade (quanto maior, mais zoom). Os marcadores ficam presos à posição na imagem — trocar por uma imagem de
        outro tamanho desalinha os marcadores já criados.
      </p>
      {size && (
        <>
          <input type="hidden" name="width" value={size.w} />
          <input type="hidden" name="height" value={size.h} />
          <p className="text-sm text-grey-200">
            Tamanho detectado: <strong>{size.w} × {size.h}</strong> px
          </p>
        </>
      )}
      <div className="flex justify-end">
        <SubmitButton>Salvar mapa</SubmitButton>
      </div>
    </ActionForm>
  );
}
