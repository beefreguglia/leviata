import type { MapPinCategory } from "@/generated/prisma/client";

export type MapPinData = {
  id: string;
  title: string;
  description: string | null;
  category: MapPinCategory;
  x: number;
  y: number;
  imageIds: string[];
  farmGuide: { id: string; title: string } | null;
  faction: { id: string; name: string } | null;
  perimeters: { id: string; name: string }[];
};
