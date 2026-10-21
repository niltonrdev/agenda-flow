import { criarClienteCalendarioGoogle } from "@/adapters/cliente-calendario-google";
import { FalhaDoCalendario } from "@/domain/falha-calendario";
import { describe, expect, it } from "vitest";

describe("cliente HTTP do Calendário Google", () => {
  it("pede ocorrências já expandida no recorte (singleEvents)", async () => {
    const urls: string[] = [];
    const cliente = criarClienteCalendarioGoogle({
      obterAccessToken: async () => "token",
      fetch: async (input) => {
        const url = String(input);
        urls.push(url);
        if (url.includes("calendarList")) {
          return new Response(JSON.stringify({ items: [{ id: "primary", selected: true }] }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      },
    });

    await cliente.listarAgendas();
    await cliente.listarEventos("primary", {
      inicio: "2025-09-04T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });

    expect(urls.some((u) => u.includes("singleEvents=true"))).toBe(true);
  });

  it("grava na agenda primary", async () => {
    const urls: string[] = [];
    const cliente = criarClienteCalendarioGoogle({
      obterAccessToken: async () => "token",
      fetch: async (input) => {
        urls.push(String(input));
        return new Response(JSON.stringify({ id: "e1", summary: "X" }), {
          status: 200,
        });
      },
    });
    await cliente.criarEvento("primary", {
      summary: "X",
      start: { date: "2025-09-04" },
      end: { date: "2025-09-08" },
    });
    expect(urls[0]).toContain("/calendars/primary/events");
  });

  it("transforma HTTP de erro em FalhaDoCalendario", async () => {
    const cliente = criarClienteCalendarioGoogle({
      obterAccessToken: async () => "token",
      fetch: async () => new Response("fail", { status: 503 }),
    });
    await expect(cliente.listarAgendas()).rejects.toBeInstanceOf(FalhaDoCalendario);
  });
});
