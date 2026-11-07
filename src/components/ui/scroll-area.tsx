"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Rolagem personalizada (shadcn/Base UI) no visual da Leviatã:
 * trilho preto, polegar preto com borda ciano e setinhas ciano em cima e embaixo.
 * As setinhas rolam um pouco a cada clique (segurar repete). A rolagem nativa (roda, toque,
 * teclado) continua funcionando normalmente.
 */
function ScrollArea({
  className,
  children,
  viewportRef,
  viewportProps,
  arrows = true,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportProps?: ScrollAreaPrimitive.Viewport.Props;
  /** mostra as setinhas de rolar (padrão: sim) */
  arrows?: boolean;
}) {
  const innerRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(viewportRef, () => innerRef.current as HTMLDivElement);

  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("group/scroll relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={innerRef}
        data-slot="scroll-area-viewport"
        {...viewportProps}
        className={cn("size-full overscroll-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50", viewportProps?.className)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar arrows={arrows} viewport={innerRef} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

const ARROW =
  "absolute right-1 z-10 hidden size-3.5 items-center justify-center rounded-[4px] border border-cyan-mid/70 bg-grey-950 text-cyan-mid transition-colors group-data-[has-overflow-y]/scroll:flex hover:border-cyan-mid hover:text-cyan-light active:bg-cyan-low [&>svg]:size-3";

/** Setinha que rola o conteúdo; segurar repete. */
function ScrollArrow({
  direction,
  viewport,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  direction: 1 | -1;
  viewport: React.RefObject<HTMLDivElement | null>;
  "data-slot"?: string;
}) {
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  React.useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return (
    <button
      {...props}
      type="button"
      tabIndex={-1} // o teclado já rola o conteúdo (setas/PageUp/PageDown); não polui o Tab
      className={cn(ARROW, className)}
      onPointerDown={(e) => {
        e.preventDefault();
        stop();
        const step = () => viewport.current?.scrollBy({ top: direction * 120, behavior: "smooth" });
        step();
        timer.current = setInterval(step, 160);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  );
}

function ScrollBar({ arrows, viewport }: { arrows: boolean; viewport: React.RefObject<HTMLDivElement | null> }) {
  return (
    <>
      {arrows && (
        <ScrollArrow direction={-1} viewport={viewport} aria-label="Rolar para cima" data-slot="scroll-up" className="top-1 group-not-data-[overflow-y-start]/scroll:opacity-35">
          <ChevronUpIcon />
        </ScrollArrow>
      )}
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        data-slot="scroll-area-scrollbar"
        className={cn(
          "absolute right-1 flex w-3.5 touch-none justify-center rounded-full border border-cyan-mid/25 bg-grey-950/90 p-px opacity-0 transition-opacity duration-200 select-none data-[has-overflow-y]:opacity-100",
          arrows ? "top-5.5 bottom-5.5" : "top-1 bottom-1",
        )}
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="w-full rounded-full border-[1.5px] border-cyan-mid bg-grey-950 shadow-[0_0_8px_-2px_rgba(6,212,236,0.6)] transition-colors hover:bg-cyan-low"
        />
      </ScrollAreaPrimitive.Scrollbar>
      {arrows && (
        <ScrollArrow direction={1} viewport={viewport} aria-label="Rolar para baixo" data-slot="scroll-down" className="bottom-1 group-not-data-[overflow-y-end]/scroll:opacity-35">
          <ChevronDownIcon />
        </ScrollArrow>
      )}
    </>
  );
}

export { ScrollArea };
