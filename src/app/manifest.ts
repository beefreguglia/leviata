import type { MetadataRoute } from "next";

/** "Adicionar à tela inicial" no celular: abre o painel como app, com o ícone LVT. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Painel Leviatã",
    short_name: "Leviatã",
    description: "Painel interno da Leviatã — Cidade dos Anjos RP",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090a",
    theme_color: "#09090a",
    lang: "pt-BR",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
