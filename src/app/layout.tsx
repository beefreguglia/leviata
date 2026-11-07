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
  title: { default: "Painel Leviata", template: "%s · Leviata" },
  description: "Painel interno da Leviata — Cidade dos Anjos RP",
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
