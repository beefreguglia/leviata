"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Rolagem personalizada (shadcn/Base UI) no visual da Leviatã:
 * trilho preto e polegar preto com borda ciano. Roda, toque e teclado funcionam normalmente.
 */
function ScrollArea({
  className,
  children,
  viewportRef,
  viewportProps,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportProps?: ScrollAreaPrimitive.Viewport.Props;
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        {...viewportProps}
        className={cn("size-full overscroll-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50", viewportProps?.className)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        data-slot="scroll-area-scrollbar"
        className="absolute top-1 right-1 bottom-1 flex w-3.5 touch-none justify-center rounded-full border border-cyan-mid/25 bg-grey-950/90 p-px opacity-0 transition-opacity duration-200 select-none data-[has-overflow-y]:opacity-100"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="w-full rounded-full border-[1.5px] border-cyan-mid bg-grey-950 shadow-[0_0_8px_-2px_rgba(6,212,236,0.6)] transition-colors hover:bg-cyan-low"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export { ScrollArea };
