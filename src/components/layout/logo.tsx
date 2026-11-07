import { cn } from "@/lib/utils";

/**
 * Identidade visual da Leviatã (arquivos em /public/brand, gerados por `npm run brand`).
 * - BrandLogo: dragão + "LEVIATÃ" (menu, login)
 * - BrandMark: monograma "LVT" (favicon, espaços pequenos)
 */
export function BrandLogo({ className, alt = "Leviatã" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- arquivo estático já otimizado (webp)
  return <img src="/brand/leviata.webp" alt={alt} width={640} height={382} decoding="async" className={cn("h-auto select-none", className)} draggable={false} />;
}

export function BrandMark({ className, alt = "LVT" }: { className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- arquivo estático já otimizado (webp)
  return <img src="/brand/lvt.webp" alt={alt} width={256} height={141} decoding="async" className={cn("h-auto select-none", className)} draggable={false} />;
}
