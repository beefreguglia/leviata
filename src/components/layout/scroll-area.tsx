"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Área rolável do conteúdo (dentro do card). Volta ao topo a cada troca de página. */
export function ContentScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  // só ao TROCAR de página (não no primeiro carregamento, senão "puxa" quem já começou a rolar)
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      ref={ref}
      id="conteudo"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
    >
      {children}
    </div>
  );
}
