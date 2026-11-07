import { Suspense } from "react";
import { ImageIcon, MapIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";
import { getMapConfig } from "@/lib/map-config";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/grouped-list";
import { Skeleton } from "@/components/ui/skeleton";
import { MapView } from "./map-view";
import { MapConfigDialog } from "./map-config-dialog";
import { createPin, deletePin, saveMapConfig, updatePin } from "./actions";

export const metadata = { title: "Mapa" };

export default async function MapaPage() {
  const viewer = await requireViewer();
  const canEdit = viewer.can("conteudo.editar");
  const map = await getMapConfig();

  const [pins, farmGuides, factions] = await Promise.all([
    db.mapPin.findMany({
      include: {
        farmGuide: { select: { id: true, title: true } },
        faction: { select: { id: true, name: true } },
        perimeters: { select: { id: true, name: true } },
      },
      orderBy: { title: "asc" },
    }),
    canEdit ? db.farmGuide.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }) : Promise.resolve([]),
    canEdit ? db.faction.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Mapa"
        description="Bases, farms, desmanches, rotas de fuga e territórios — com prints."
        actions={canEdit && <MapConfigDialog action={saveMapConfig} current={map} />}
      />
      {!map ? (
        <EmptyState
          icon={canEdit ? ImageIcon : MapIcon}
          title="O mapa ainda não foi configurado"
          description={canEdit ? "Envie a imagem do mapa da cidade no botão acima para começar a marcar lugares." : "Peça para a gerência enviar a imagem do mapa."}
        />
      ) : (
        <Suspense fallback={<Skeleton className="h-[60svh] rounded-card" />}>
          <MapView
            map={map}
            pins={pins}
            canEdit={canEdit}
            farmGuides={farmGuides}
            factions={factions}
            createPin={createPin}
            updatePin={updatePin}
            deletePin={deletePin}
          />
        </Suspense>
      )}
    </>
  );
}
