import type { AppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/logo";

/**
 * Tela de estado (404, sem acesso, erro). `fullscreen` = fora do painel (centralizada na tela);
 * sem ela, fica dentro do card de conteúdo do painel.
 */
export function StatusScreen({
  icon: Icon,
  code,
  title,
  description,
  actions,
  fullscreen,
  tone = "primary",
}: {
  icon: AppIcon;
  code?: string;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  fullscreen?: boolean;
  tone?: "primary" | "danger" | "warning";
}) {
  const toneClass = { primary: "bg-cyan-low text-cyan-light", danger: "bg-danger-low text-danger-light", warning: "bg-warning-low text-warning" }[tone];
  // dentro do painel já existe um <main>: aqui vira <section>
  const Tag = fullscreen ? "main" : "section";
  return (
    <Tag
      aria-labelledby="status-title"
      className={cn("flex flex-col items-center justify-center px-4 text-center", fullscreen ? "min-h-svh py-12" : "min-h-[60svh] py-10")}
    >
      {fullscreen && <BrandMark alt="Leviatã" className="mb-10 w-24 opacity-90" />}
      <span className={cn("flex size-20 items-center justify-center rounded-card", toneClass)}>
        <Icon className="size-9" aria-hidden="true" />
      </span>
      {code && <p className="mt-6 font-mono text-sm font-bold tracking-widest text-muted-foreground">{code}</p>}
      <h1 id="status-title" className={cn("type-h1 text-grey-100", code ? "mt-2" : "mt-6")}>
        {title}
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">{description}</p>
      {actions && <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>}
    </Tag>
  );
}
