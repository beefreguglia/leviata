import { UploadImage } from "@/components/upload-image";
import { cn } from "@/lib/utils";

/** Logo da facção ou as iniciais na cor dela. */
export function FactionAvatar({
  name,
  tag,
  color,
  logoId,
  className,
}: {
  name: string;
  tag?: string | null;
  color: string;
  logoId?: string | null;
  className?: string;
}) {
  if (logoId) return <UploadImage id={logoId} alt="" className={cn("size-12 shrink-0 rounded-md", className)} />;
  return (
    <span
      className={cn("flex size-12 shrink-0 items-center justify-center rounded-md text-sm font-bold text-grey-950", className)}
      style={{ background: color }}
      aria-hidden="true"
    >
      {(tag || name).slice(0, 3).toUpperCase()}
    </span>
  );
}
