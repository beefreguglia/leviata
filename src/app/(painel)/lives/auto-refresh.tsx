"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados do servidor de tempos em tempos (só com a aba visível). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
