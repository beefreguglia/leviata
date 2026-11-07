"use client";

import { useState } from "react";
import { ImageIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/actions";
import { MapConfigForm } from "./map-config-form";

export function MapConfigDialog({
  action,
  current,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  current: { imageId: string } | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={current ? "secondary" : "default"}>
            <ImageIcon /> {current ? "Trocar imagem do mapa" : "Enviar imagem do mapa"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imagem do mapa</DialogTitle>
          <DialogDescription>PNG, JPG ou WEBP até 8 MB.</DialogDescription>
        </DialogHeader>
        <MapConfigForm action={action} current={current} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
