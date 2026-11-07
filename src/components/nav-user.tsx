"use client";

import Link from "next/link";
import { ChevronsUpDownIcon, IdCardIcon, LogOutIcon, UserXIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export type SidebarUser = {
  name: string;
  rank: string | null;
  rankColor: string | null;
  avatarUrl: string | null;
  memberId: string | null;
};

function UserIdentity({ user }: { user: SidebarUser }) {
  return (
    <>
      <Avatar className="size-8 rounded-md">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
        <AvatarFallback className="rounded-md">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: user.rankColor ?? "var(--muted-foreground)" }} />
          {user.rank ?? "Sem patente"}
        </span>
      </div>
    </>
  );
}

export function NavUser({ user, signOutAction }: { user: SidebarUser; signOutAction: () => Promise<void> }) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" aria-label="Menu do usuário" className="aria-expanded:bg-sidebar-accent" />}
          >
            <UserIdentity user={user} />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <UserIdentity user={user} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user.memberId && (
                <DropdownMenuItem render={<Link href={`/membros/${user.memberId}`} />}>
                  <IdCardIcon /> Minha ficha
                </DropdownMenuItem>
              )}
              <DropdownMenuItem render={<Link href="/ausencias" />}>
                <UserXIcon /> Avisar ausência
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void signOutAction()}>
              <LogOutIcon /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
