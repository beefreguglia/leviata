import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRESENCE, type Presence } from "@/lib/labels";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { avatar: "size-8", dot: "size-2.5 ring-2", text: "text-[10px]" },
  md: { avatar: "size-10", dot: "size-3 ring-[3px]", text: "text-xs" },
  lg: { avatar: "size-20", dot: "size-5 ring-4 right-0.5 bottom-0.5", text: "text-xl" },
} as const;

/** Avatar com a bolinha de presença (ativo, ausente, afastado...) no canto. */
export function PresenceAvatar({
  name,
  src,
  presence,
  size = "md",
  ringClassName = "ring-card",
}: {
  name: string;
  src?: string | null;
  presence: Presence;
  size?: keyof typeof SIZES;
  /** cor do anel em volta da bolinha = cor do fundo onde o avatar está */
  ringClassName?: string;
}) {
  const s = SIZES[size];
  const p = PRESENCE[presence];
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar className={s.avatar}>
        {src && <AvatarImage src={src} alt="" />}
        <AvatarFallback className={s.text}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span
        role="img"
        aria-label={p.label}
        title={p.label}
        className={cn("absolute right-0 bottom-0 rounded-full", s.dot, p.dot, ringClassName)}
      />
    </span>
  );
}

/** Legenda das bolinhas. */
export function PresenceLegend({ only }: { only?: Presence[] }) {
  const keys = only ?? (["ATIVO", "AUSENTE", "AFASTADO", "INATIVO"] as Presence[]);
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda de presença">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", PRESENCE[k].dot)} aria-hidden="true" />
          {PRESENCE[k].label}
        </li>
      ))}
    </ul>
  );
}
