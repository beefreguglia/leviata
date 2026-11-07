"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as LeafletMap, Marker } from "leaflet";
import { CrosshairIcon, MapPinIcon, PencilIcon, SearchIcon, Trash2Icon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { UploadImage } from "@/components/upload-image";
import { PIN_CATEGORY } from "@/lib/labels";
import { uploadUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions";
import type { MapPinCategory } from "@/generated/prisma/client";
import { PinFields } from "./pin-fields";
import type { MapPinData } from "./types";

type Props = {
  map: { imageId: string; width: number; height: number };
  pins: MapPinData[];
  canEdit: boolean;
  farmGuides: { id: string; title: string }[];
  factions: { id: string; name: string }[];
  createPin: (fd: FormData) => Promise<ActionResult>;
  updatePin: (id: string, fd: FormData) => Promise<ActionResult>;
  deletePin: (id: string) => Promise<ActionResult>;
};

type DialogState = { mode: "create"; x: number; y: number } | { mode: "edit"; pin: MapPinData } | null;

export function MapView({ map, pins, canEdit, farmGuides, factions, createPin, updatePin, deletePin }: Props) {
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const addingRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(params.get("pin"));
  const [hidden, setHidden] = useState<Set<MapPinCategory>>(new Set());
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const visible = useMemo(
    () =>
      pins.filter(
        (p) => !hidden.has(p.category) && (!query || p.title.toLowerCase().includes(query.toLowerCase())),
      ),
    [pins, hidden, query],
  );
  const selected = pins.find((p) => p.id === selectedId) ?? null;
  const counts = useMemo(() => {
    const c = new Map<MapPinCategory, number>();
    for (const p of pins) c.set(p.category, (c.get(p.category) ?? 0) + 1);
    return c;
  }, [pins]);

  // pixel (x,y a partir do canto superior esquerdo) <-> latlng do CRS.Simple
  const toLatLng = (x: number, y: number) => [map.height - y, x] as [number, number];

  // cria o mapa uma vez
  useEffect(() => {
    let disposed = false;
    const markers = markersRef.current;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current || mapRef.current) return;
      const bounds = L.latLngBounds([0, 0], [map.height, map.width]);
      // zoom 0 = 1 pixel da imagem por pixel da tela. Mínimo: o mapa inteiro na tela; máximo: 3 níveis
      // (8×) acima disso, para aproximar bem dos detalhes
      const m = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        minZoom: -6,
        maxZoom: 4,
        zoomSnap: 0.25,
        maxBounds: bounds,
        maxBoundsViscosity: 1,
        attributionControl: false,
      });
      L.imageOverlay(uploadUrl(map.imageId), bounds).addTo(m);
      // mínimo = a imagem inteira cabendo na área do mapa (recalcula quando a área muda de tamanho)
      const ZOOM_IN_LEVELS = 3;
      const fitMinZoom = () => {
        const fit = m.getBoundsZoom(bounds);
        m.setMinZoom(fit);
        m.setMaxZoom(fit + ZOOM_IN_LEVELS);
        if (m.getZoom() < fit) m.setZoom(fit);
      };
      m.fitBounds(bounds);
      fitMinZoom();
      m.on("resize", fitMinZoom);
      m.on("click", (e) => {
        if (!addingRef.current) return;
        const x = e.latlng.lng;
        const y = map.height - e.latlng.lat;
        if (x < 0 || y < 0 || x > map.width || y > map.height) return;
        setAdding(false);
        setDialog({ mode: "create", x, y });
      });
      mapRef.current = m;
      setTimeout(() => m.invalidateSize(), 0);
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, [map.imageId, map.width, map.height]);

  // marcadores (refaz quando a lista/filtro/seleção muda)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const m = mapRef.current;
      if (cancelled || !m) return;
      for (const mk of markersRef.current.values()) mk.remove();
      markersRef.current.clear();
      for (const p of visible) {
        const isSel = p.id === selectedId;
        const icon = L.divIcon({
          className: cn("leviata-pin", isSel && "is-selected"),
          html: `<span style="--c:${PIN_CATEGORY[p.category].color}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const mk = L.marker(toLatLng(p.x, p.y), { icon, title: p.title, keyboard: true, riseOnHover: true })
          .addTo(m)
          .on("click", () => setSelectedId(p.id));
        markersRef.current.set(p.id, mk);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toLatLng depende só de map.height
  }, [visible, selectedId, map.height]);

  // modo "adicionar": cursor de mira
  useEffect(() => {
    addingRef.current = adding;
    containerRef.current?.classList.toggle("is-adding", adding);
  }, [adding]);

  // centraliza no selecionado
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.flyTo(toLatLng(selected.x, selected.y), Math.max(mapRef.current.getZoom(), 0), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const toggleCat = (c: MapPinCategory) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex min-h-0 flex-col gap-3 lg:h-[calc(100svh-15rem)]">
        {selected ? (
          <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-card bg-card p-5" data-testid="pin-panel">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-grey-200">
                  <span className="size-2.5 rounded-full" style={{ background: PIN_CATEGORY[selected.category].color }} />
                  {PIN_CATEGORY[selected.category].label}
                </span>
                <h2 className="text-lg font-bold text-grey-100">{selected.title}</h2>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => setSelectedId(null)}>
                <XIcon />
              </Button>
            </div>
            {selected.description && <p className="text-sm whitespace-pre-wrap text-grey-300">{selected.description}</p>}
            {selected.imageIds.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selected.imageIds.map((id, i) => (
                  <a key={id} href={uploadUrl(id)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md bg-input">
                    <UploadImage id={id} alt={`Print ${i + 1} de ${selected.title}`} className="aspect-video w-full" />
                  </a>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm">
              {selected.farmGuide && (
                <Link href={`/farm/${selected.farmGuide.id}`} className="text-cyan-light hover:underline">
                  Guia de farm: {selected.farmGuide.title}
                </Link>
              )}
              {selected.faction && (
                <Link href={`/faccoes/${selected.faction.id}`} className="text-cyan-light hover:underline">
                  Facção: {selected.faction.name}
                </Link>
              )}
            </div>
            {canEdit && (
              <div className="mt-auto flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDialog({ mode: "edit", pin: selected })}>
                  <PencilIcon /> Editar
                </Button>
                <ConfirmButton
                  title={`Remover "${selected.title}" do mapa?`}
                  confirmLabel="Remover"
                  destructive
                  action={async () => {
                    const r = await deletePin(selected.id);
                    if (r.ok) setSelectedId(null);
                    return r;
                  }}
                  trigger={
                    <Button variant="ghost" aria-label={`Remover ${selected.title}`}>
                      <Trash2Icon /> Remover
                    </Button>
                  }
                />
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-500" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar lugar" className="bg-card pl-12" aria-label="Buscar lugar" />
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Categorias">
              {(Object.keys(PIN_CATEGORY) as MapPinCategory[])
                .filter((c) => counts.get(c))
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={!hidden.has(c)}
                    onClick={() => toggleCat(c)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors",
                      hidden.has(c) ? "bg-grey-800 text-grey-500" : "bg-grey-700 text-grey-100 hover:bg-grey-600",
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: PIN_CATEGORY[c].color, opacity: hidden.has(c) ? 0.3 : 1 }} />
                    {PIN_CATEGORY[c].label} <span className="font-normal opacity-70">{counts.get(c)}</span>
                  </button>
                ))}
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto rounded-card bg-card [&>*+*]:border-t [&>*+*]:border-grey-700" aria-label="Lugares no mapa">
              {visible.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">Nenhum lugar {pins.length ? "com esse filtro" : "marcado ainda"}.</li>}
              {visible.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelectedId(p.id)} className="flex min-h-12 w-full items-center gap-3 px-5 py-3 text-left hover:bg-grey-700">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: PIN_CATEGORY[p.category].color }} />
                    <span className="min-w-0 flex-1 truncate text-base text-grey-100">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{PIN_CATEGORY[p.category].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {canEdit && (
          <Button variant={adding ? "secondary" : "default"} onClick={() => setAdding((a) => !a)} aria-pressed={adding}>
            {adding ? <XIcon /> : <CrosshairIcon />}
            {adding ? "Cancelar marcação" : "Marcar lugar"}
          </Button>
        )}
      </aside>

      {/* isolate: as camadas do Leaflet (z-index até 1000) ficam presas aqui e não passam por cima dos diálogos */}
      <div className="relative isolate overflow-hidden rounded-card bg-grey-950">
        {adding && (
          <p className="absolute top-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg">
            <MapPinIcon className="size-4" /> Clique no mapa onde fica o lugar
          </p>
        )}
        <div ref={containerRef} className="h-[60svh] w-full lg:h-[calc(100svh-15rem)]" data-testid="map" role="application" aria-label="Mapa da cidade" />
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Editar lugar" : "Marcar lugar"}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <ActionForm
              action={dialog.mode === "edit" ? updatePin.bind(null, dialog.pin.id) : createPin}
              onSuccess={() => setDialog(null)}
              className="flex flex-col gap-4"
            >
              <PinFields
                pin={dialog.mode === "edit" ? dialog.pin : undefined}
                x={dialog.mode === "edit" ? dialog.pin.x : dialog.x}
                y={dialog.mode === "edit" ? dialog.pin.y : dialog.y}
                farmGuides={farmGuides}
                factions={factions}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
                  Cancelar
                </Button>
                <SubmitButton>{dialog.mode === "edit" ? "Salvar" : "Marcar"}</SubmitButton>
              </DialogFooter>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
