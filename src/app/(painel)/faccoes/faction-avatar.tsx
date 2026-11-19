import { UploadImage } from "@/components/upload-image";
import { cn } from "@/lib/utils";

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
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-bold",
        color2 ? "text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]" : "text-grey-950",
        className,
      )}
      style={{ background: factionBackground(color, color2) }}
      aria-hidden="true"
    >
      {(tag || name).slice(0, 3).toUpperCase()}
    </span>
  );
}
