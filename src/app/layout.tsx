import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const semTexto = DM_Sans({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const semMarca = Fraunces({
  variable: "--font-marca",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Agenda Inteligente",
  description:
    "Conversa pessoal para consultar Disponibilidade no Calendário do Dono.",
  applicationName: "Agenda Inteligente",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Agenda Inteligente",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1c2a24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${semTexto.variable} ${semMarca.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
