import { redirect } from "next/navigation";
import { ScrollTextIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { EmptyState } from "@/components/layout/grouped-list";

export const metadata = { title: "Regras" };

export default async function RegrasPage() {
  const viewer = await getViewer();
  const full = viewer?.can("painel.ver") ?? false;
  const first = await db.rulePage.findFirst({
    where: full ? {} : { isPublic: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
  if (first) redirect(`/regras/${first.slug}`);
  return <EmptyState icon={ScrollTextIcon} title="Nenhuma regra publicada" description="A liderança ainda não escreveu as regras." />;
}
