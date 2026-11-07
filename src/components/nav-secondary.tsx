"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { hasPermission } from "@/lib/permissions";
import { NAV_SECONDARY, isActivePath } from "@/components/layout/nav";

export function NavSecondary({
  permissions,
  ...props
}: { permissions: string[] } & React.ComponentProps<typeof SidebarGroup>) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = NAV_SECONDARY.filter((i) => !i.perm || hasPermission(permissions, i.perm));

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  size="sm"
                  isActive={!item.external && isActivePath(pathname, item.href)}
                  render={
                    item.external ? (
                      <a href={item.href} target="_blank" rel="noreferrer" />
                    ) : (
                      <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)} />
                    )
                  }
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
