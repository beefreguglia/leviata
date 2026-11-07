"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FLASH, type FlashCode } from "@/lib/flash-codes";

/** Mostra o toast de sucesso vindo de um redirect (?ok=criado) e limpa a URL. */
export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const code = params.get("ok");

  useEffect(() => {
    if (!code) return;
    if (code in FLASH) toast.success(FLASH[code as FlashCode]);
    const next = new URLSearchParams(params);
    next.delete("ok");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [code, params, pathname, router]);

  return null;
}
