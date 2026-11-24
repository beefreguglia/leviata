"use client";

import { CheckIcon, CrosshairIcon, RotateCcwIcon, Undo2Icon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { cn } from "@/lib/utils";
import type { MapRoute } from "@/lib/map-routes";

/** Painel de uma rota de coleta: próxima parada, progresso e a grade para marcar/desmarcar. */
export function RoutePanel({
  route,
  done,
  next,
  onToggle,
  onDoneNext,
  onUndo,
  onReset,
  onFocusNext,
  onClose,
}: {
  route: MapRoute;
  done: Set<number>;
  /** índice da próxima parada (−1 = rota completa) */
  next: number;
  onToggle: (i: number) => void;
  onDoneNext: () => void;
  onUndo: () => void;
  onReset: () => void;
  onFocusNext: () => void;
  onClose: () => void;
}) {
  const total = route.points.length;
  const pct = Math.round((done.size / total) * 100);
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-card glass-card p-5" data-testid="route-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-grey-200">
            <span className="size-2.5 rounded-full" style={{ background: route.color }} /> Rota
          </span>
          <h2 className="text-lg font-bold text-grey-100">{route.name}</h2>
          <p className="text-sm text-muted-foreground">{route.description}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Sair da rota" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      <div className="flex items-end justify-between gap-3">
        {next >= 0 ? (
          <div>
            <span className="type-label text-muted-foreground">Próxima parada</span>
            <p className="type-stat text-grey-100 tabular-nums" data-testid="route-next">
              {next + 1}
              <span className="ml-1 text-base font-normal text-muted-foreground">de {total}</span>
            </p>
          </div>
        ) : (
          <p className="text-lg font-bold text-success" data-testid="route-next">
            Rota completa!
          </p>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">
          {done.size}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-grey-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done.size} aria-label="Paradas feitas">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: route.color }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onDoneNext} disabled={next < 0} className="col-span-2">
          <CheckIcon /> {next >= 0 ? `Parada ${next + 1} feita` : "Tudo feito"}
        </Button>
        <Button variant="secondary" onClick={onFocusNext} disabled={next < 0}>
          <CrosshairIcon /> Ver no mapa
        </Button>
        <Button variant="secondary" onClick={onUndo} disabled={done.size === 0}>
          <Undo2Icon /> Voltar uma
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="type-label text-muted-foreground">Paradas · toque para marcar ou desmarcar</span>
        <div className="grid grid-cols-8 gap-1" aria-label={`Paradas da rota ${route.name}`}>
          {route.points.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={done.has(i)}
              aria-label={`Parada ${i + 1}${done.has(i) ? " (feita)" : ""}`}
              onClick={() => onToggle(i)}
              className={cn(
                "flex h-8 items-center justify-center rounded text-xs font-bold tabular-nums transition-colors",
                done.has(i) ? "bg-grey-800 text-grey-500 line-through" : i === next ? "text-grey-950" : "bg-grey-700 text-grey-100 hover:bg-grey-600",
              )}
              style={i === next && !done.has(i) ? { background: route.color } : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {done.size > 0 && (
        <ConfirmButton
          title={`Recomeçar a rota ${route.name}?`}
          description="Todas as paradas voltam a ficar pendentes."
          confirmLabel="Recomeçar"
          action={async () => {
            onReset();
            return { ok: true, message: "Rota recomeçada" };
          }}
          trigger={
            <Button variant="ghost" className="mt-auto self-start">
              <RotateCcwIcon /> Recomeçar
            </Button>
          }
        />
      )}
    </section>
  );
}
