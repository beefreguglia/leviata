/* eslint-disable @next/next/no-img-element -- imagens privadas servidas por /api/uploads (com cookie); o otimizador do next/image não envia a sessão */
import { uploadUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/** Mostra uma imagem enviada (rota autenticada /api/uploads/:id). */
export function UploadImage({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  return <img src={uploadUrl(id)} alt={alt} loading="lazy" decoding="async" className={cn("object-cover", className)} />;
}
