import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { FarmForm } from "../farm-form";
import { createFarmGuide } from "../actions";

export const metadata = { title: "Novo guia de farm" };

export default async function NovoFarmPage() {
  await requireViewer("farm.editar");
  const items = await db.item.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo guia de farm" description="Ensine a fac a farmar: local, passo a passo e prints." />
      <FarmForm action={createFarmGuide} items={items} submitLabel="Publicar" />
    </div>
  );
}
