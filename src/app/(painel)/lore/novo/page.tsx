import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { LoreForm } from "../lore-form";
import { createLore } from "../actions";

export const metadata = { title: "Escrever lore" };

export default async function NovaLorePage() {
  await requireViewer("lore.editar");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Escrever na lore" description="Registre um fato, personagem, lugar ou aliança da cidade." />
      <LoreForm action={createLore} submitLabel="Publicar" />
    </div>
  );
}
