import { cn } from "@/lib/utils";

/**
 * Bloco de lista (card Andromeda: shape-primary, raio 10px, separadores grey-700).
 * Cabeçalho de seção acima e nota de rodapé abaixo.
 */
export function GroupedList({
  header,
  footer,
  action,
  glass,
  className,
  children,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  /** visual de vidro (globals.css): precisa de .glass-glow atrás */
  glass?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {(header || action) && (
        <div className="flex items-center justify-between gap-3">
          {header && <h2 className="type-h2 text-grey-300">{header}</h2>}
          {action}
        </div>
      )}
      <div className={cn("overflow-hidden rounded-card [&>*+*]:border-t", glass ? "glass-card [&>*+*]:border-white/10" : "bg-card [&>*+*]:border-grey-700")}>{children}</div>
      {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
    </section>
  );
}

export function GroupedRow({
  label,
  children,
  className,
}: {
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-4 px-5 py-3 text-base", className)}>
      {label !== undefined && <span className="text-grey-200">{label}</span>}
      {children !== undefined && <span className="min-w-0 text-right text-grey-100">{children}</span>}
    </div>
  );
}

/** Estado vazio: ícone, frase curta e ação. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-grey-700 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-grey-800">
        <Icon className="size-6 text-muted-foreground" />
      </span>
      <p className="text-lg font-bold text-grey-100">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
