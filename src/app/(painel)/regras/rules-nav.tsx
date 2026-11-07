"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function RulesNav({ pages }: { pages: { slug: string; title: string; isPublic: boolean }[] }) {
  const pathname = usePathname();
  if (!pages.length) return <p className="px-3 text-sm text-muted-foreground">Nenhuma regra ainda.</p>;
  return (
    <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {pages.map((p) => {
        const active = pathname === `/regras/${p.slug}` || pathname.startsWith(`/regras/${p.slug}/`);
        return (
          <li key={p.slug} className="shrink-0">
            <Link
              href={`/regras/${p.slug}`}
              className={cn(
                "relative flex h-10 items-center rounded-md px-3 text-sm transition-colors",
                active ? "font-medium text-primary" : "text-grey-300 hover:bg-grey-800 hover:text-grey-100",
              )}
            >
              {active && <motion.span layoutId="rules-active" className="absolute inset-0 rounded-md bg-grey-800 shadow-[inset_3px_0_0_var(--cyan-mid)]" />}
              <span className="relative">{p.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
