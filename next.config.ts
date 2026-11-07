import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // os testes e2e sobem um servidor próprio em outra pasta (não conflita com o `npm run dev`)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // indicador de dev no canto direito (no esquerdo cobria o usuário do menu)
  devIndicators: { position: "bottom-right" },
  // Painel é todo autenticado e por usuário → renderização dinâmica clássica (sem Cache Components).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
