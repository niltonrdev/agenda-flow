import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda Inteligente",
    short_name: "Agenda",
    description:
      "Conversa pessoal para consultar Disponibilidade no Calendário do Dono.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e8efe9",
    theme_color: "#1c2a24",
    lang: "pt-BR",
    id: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
