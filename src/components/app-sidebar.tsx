"use client";

import Link from "next/link";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LeviataMark } from "@/components/layout/logo";
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LeviataMark className="size-5" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-bold">Leviata</span>
                <span className="truncate text-xs text-muted-foreground">Cidade dos Anjos</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
