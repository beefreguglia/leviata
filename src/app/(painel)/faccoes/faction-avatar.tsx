import { UploadImage } from "@/components/upload-image";
import { cn } from "@/lib/utils";
import { textToneOn } from "@/lib/contrast";

/** Fundo das iniciais: uma cor, ou duas divididas na diagonal. */
export function factionBackground(color: string, color2?: string | null) {
  return color2 ? `linear-gradient(135deg, ${color} 50%, ${color2} 50%)` : color;
}

/** Logo da facção ou as iniciais na(s) cor(es) dela. */
export function FactionAvatar({
  name,
  tag,
  color,
  color2,
  logoId,
  className,
}: {
  name: string;
  tag?: string | null;
  color: string;
  color2?: string | null;
  logoId?: string | null;
  className?: string;
}) {
  if (logoId) return <UploadImage id={logoId} alt="" className={cn("size-12 shrink-0 rounded-md", className)} />;
  const light = textToneOn(color, ...(color2 ? [color2] : [])) === "light";
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-bold",
        light ? "text-white" : "text-grey-950",
        // com duas cores a sigla fica em cima da divisão: sombra no tom oposto segura a leitura nos dois lados
        color2 && (light ? "[text-shadow:0_1px_3px_rgb(0_0_0/0.85)]" : "[text-shadow:0_0_3px_rgb(255_255_255/0.85)]"),
        className,
      )}
      style={{ background: factionBackground(color, color2) }}
      aria-hidden="true"
    >
      {(tag || name).slice(0, 3).toUpperCase()}
    </span>
  );
}
