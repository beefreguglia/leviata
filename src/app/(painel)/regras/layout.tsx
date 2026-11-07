import { PlusIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { LinkButton } from "@/components/ui/link-button";
import { RulesNav } from "./rules-nav";

export default async function RegrasLayout({ children }: LayoutProps<"/regras">) {
  const viewer = await getViewer();
  const full = viewer?.can("painel.ver") ?? false;
  const pages = await db.rulePage.findMany({
    where: full ? {} : { isPublic: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { slug: true, title: true, isPublic: true },
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
        <h2 className="px-3 type-h2 text-grey-300">Páginas</h2>
        <RulesNav pages={pages} />
        {viewer?.can("regras.editar") && (
          <LinkButton href="/regras/nova" variant="ghost" className="justify-start text-primary">
            <PlusIcon /> Nova página
          </LinkButton>
        )}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
