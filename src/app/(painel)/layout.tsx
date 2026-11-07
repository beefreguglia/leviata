import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getViewer } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ContentScroll } from "@/components/layout/scroll-area";
import { FlashToast } from "@/components/flash-toast";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.member || viewer.member.status === "EXPULSO") redirect("/sem-acesso");

  // lembra se o menu estava aberto ou recolhido
  const sidebarState = (await cookies()).get("sidebar_state")?.value;
  const user = {
    name: viewer.member.rpName,
    rank: viewer.member.rank?.name ?? null,
    rankColor: viewer.member.rank?.color ?? null,
    avatarUrl: viewer.user.avatarUrl,
    memberId: viewer.member.id,
  };

  return (
    // altura travada na tela: o header fica fixo e só o conteúdo do card rola
    <SidebarProvider defaultOpen={sidebarState !== "false"} className="h-svh overflow-hidden">
      <AppSidebar user={user} permissions={viewer.permissions} signOutAction={signOutAction} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
          <SidebarTrigger className="-ml-1 size-10" aria-label="Abrir menu" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
          <Breadcrumbs />
        </header>
        <Suspense>
          <FlashToast />
        </Suspense>
        <ContentScroll>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </ContentScroll>
      </SidebarInset>
    </SidebarProvider>
  );
}
