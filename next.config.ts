import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // os testes e2e sobem um servidor próprio em outra pasta (não conflita com o `npm run dev`)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // indicador de dev no canto direito (no esquerdo cobria o usuário do menu)
  devIndicators: { position: "bottom-right" },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
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
