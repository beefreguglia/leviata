import { redirect } from "next/navigation";
import type { FlashCode } from "@/lib/flash-codes";

export function withFlash(path: string, code: FlashCode) {
  return `${path}${path.includes("?") ? "&" : "?"}ok=${code}`;
}

/** redirect() + toast de sucesso na página de destino (ver FlashToast). */
export function redirectWithToast(path: string, code: FlashCode): never {
  redirect(withFlash(path, code));
}
