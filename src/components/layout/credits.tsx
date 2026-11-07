import { cn } from "@/lib/utils";

/** Crédito do autor do painel (rodapé do menu e da tela de login). */
export function Credits({ className }: { className?: string }) {
  return (
    <p className={cn("type-caption text-muted-foreground", className)}>
      Criado por{" "}
      <a
        href="https://github.com/beefreguglia"
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-grey-200 underline-offset-4 transition-colors hover:text-cyan-light hover:underline"
      >
        Bernardo Freguglia
      </a>
    </p>
  );
}
