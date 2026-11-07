import type { Metadata, Viewport } from "next";
import { Fira_Code, Roboto } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/components/motion";
import "./globals.css";

// Tipografia do Andromeda: Roboto (texto) e Fira Code (código)
const body = Roboto({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "700"] });
const mono = Fira_Code({ variable: "--font-mono-face", subsets: ["latin"] });

export const metadata: Metadata = {
  // URL pública: deixa as imagens da prévia de link (Discord/WhatsApp) com endereço completo
  metadataBase: new URL(process.env.AUTH_URL || "http://localhost:3000"),
  applicationName: "Painel Leviatã",
  title: { default: "Painel Leviatã", template: "%s · Leviatã" },
  description: "Painel interno da Leviatã — Cidade dos Anjos RP",
  openGraph: { siteName: "Leviatã", title: "Painel Leviatã", description: "Painel interno da Leviatã — Cidade dos Anjos RP", locale: "pt_BR", type: "website" },
  // painel privado: fora dos buscadores
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Leviatã", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09090a", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </MotionProvider>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
