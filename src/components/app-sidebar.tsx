"use client";

import Link from "next/link";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/layout/logo";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser, type SidebarUser } from "@/components/nav-user";

/** Menu lateral no padrão shadcn sidebar-08 (inset + grupos recolhíveis + usuário no rodapé). */
export function AppSidebar({
  user,
  permissions,
  signOutAction,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser;
  permissions: string[];
  signOutAction: () => Promise<void>;
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <Link
          href="/dashboard"
          aria-label="Leviatã — ir para o início"
          className="group/brand flex items-center justify-center rounded-md px-3 py-2 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandLogo alt="" className="w-40 transition-[filter] duration-300 group-hover/brand:drop-shadow-[0_0_12px_rgba(6,212,236,0.45)]" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain permissions={permissions} />
        <NavSecondary permissions={permissions} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signOutAction={signOutAction} />
      </SidebarFooter>
    </Sidebar>
  );
}
