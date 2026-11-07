"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from "@/components/ui/sidebar";
import { hasPermission } from "@/lib/permissions";
import { NAV_MAIN, isActivePath } from "@/components/layout/nav";

export function NavMain({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const close = () => isMobile && setOpenMobile(false);

  const sections = NAV_MAIN.map((s) => ({
    ...s,
    items: s.items?.filter((i) => !i.perm || hasPermission(permissions, i.perm)),
  })).filter((s) => (s.href ? !s.perm || hasPermission(permissions, s.perm) : s.items?.length));

  if (!sections.length) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="type-label text-sidebar-foreground/60">Painel</SidebarGroupLabel>
      <SidebarMenu>
        {sections.map((section) => {
          const Icon = section.icon;
          if (section.href) {
            return (
              <SidebarMenuItem key={section.label}>
                <SidebarMenuButton
                  tooltip={section.label}
                  isActive={isActivePath(pathname, section.href)}
                  render={<Link href={section.href} onClick={close} />}
                >
                  <Icon />
                  <span>{section.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const items = section.items ?? [];
          const activeChild = items.some((i) => !i.soon && isActivePath(pathname, i.href));
          return (
            <Collapsible key={section.label} defaultOpen={activeChild || section.label === "Fac"} render={<SidebarMenuItem />}>
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={section.label}
                    className="[&[data-panel-open]>svg:last-child]:rotate-90"
                  />
                }
              >
                <Icon />
                <span>{section.label}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {items.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      {item.soon ? (
                        <SidebarMenuSubButton
                          aria-disabled="true"
                          title={`Chega na ${item.soon}`}
                          className="cursor-default opacity-50"
                          render={<span />}
                        >
                          <span className="flex-1">{item.label}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">{item.soon}</span>
                        </SidebarMenuSubButton>
                      ) : (
                        <SidebarMenuSubButton
                          isActive={isActivePath(pathname, item.href)}
                          render={<Link href={item.href} onClick={close} />}
                        >
                          <span>{item.label}</span>
                        </SidebarMenuSubButton>
                      )}
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
