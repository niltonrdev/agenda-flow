import { serializarSessao } from "@/lib/google-oauth";
import { resetarRateLimitParaTestes } from "@/lib/rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "segredo-aes-de-teste-com-32b-ok!";

const estado = vi.hoisted(() => ({ pacote: "" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === "agenda_google" && estado.pacote
        ? { value: estado.pacote }
        : undefined,
  }),
}));

vi.mock("@/lib/calendario-app", async () => {
  const { criarCalendarioDeDemonstracao, criarCalendarioEmMemoria } =
    await import("@/adapters/calendario-em-memoria");
  const { FUSO_DONO: fuso } = await import("@/domain/fuso");
  const { DateTime: Luxon } = await import("luxon");
  return {
    obterCalendario: (opcoes: {
      agora?: InstanceType<typeof Luxon>;
      demonstracao?: boolean;
    }) => {
      const agora =
        opcoes.agora ??
        Luxon.fromObject(
          { year: 2026, month: 11, day: 16, hour: 10 },
          { zone: fuso },
        );
      if (opcoes.demonstracao) {
        return criarCalendarioDeDemonstracao(agora);
      }
      return criarCalendarioEmMemoria([
        {
          id: "dent",
          titulo: "Dentista",
          tipo: "pontual",
          inicio: "2026-12-10T15:00:00.000-03:00",
          fim: "2026-12-10T16:00:00.000-03:00",
        },
        {
          id: "natal",
          titulo: "Viagem de Natal",
          tipo: "periodo",
          primeiroDia: "2026-12-24",
          ultimoDia: "2026-12-26",
        },
      ]);
    },
  };
});

function pedido(mensagem: string, extra: Record<string, unknown> = {}) {
  return new Request("https://preview.example/api/conversa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://preview.example",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ mensagem, ...extra }),
  });
}

describe("API conversa — mesmo interpretador no demo e no logado", () => {
  const envAntes = { ...process.env };

  beforeEach(() => {
    resetarRateLimitParaTestes();
    process.env.NODE_ENV = "production";
    process.env.GOOGLE_TOKEN_SECRET = SECRET;
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret-com-mais-de-32-caracteres-ok";
    estado.pacote = serializarSessao(
      {
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: Date.now() + 3_600_000,
        email: "dono@example.com",
      },
      SECRET,
    );
  });

  afterEach(() => {
    process.env = { ...envAntes };
  });

  it("demo e logado listam dezembro sem a preposição 'de'", async () => {
    const { POST } = await import("@/app/api/conversa/route");
    const demo = await POST(
      pedido("Mostrar compromissos dezembro", { demonstracao: true }),
    );
    expect(demo.status).toBe(200);
    const corpoDemo = (await demo.json()) as { texto?: string };
    expect(corpoDemo.texto).toMatch(/Compromissos de dezembro/);
    expect(corpoDemo.texto).not.toMatch(/não entendi/i);
    expect(corpoDemo.texto).toContain("Almoço de equipe");

    const logado = await POST(pedido("Mostrar eventos dezembro"));
    expect(logado.status).toBe(200);
    const corpoLogado = (await logado.json()) as { texto?: string };
    expect(corpoLogado.texto).toMatch(/Compromissos de dezembro/);
    expect(corpoLogado.texto).not.toMatch(/não entendi/i);
    expect(corpoLogado.texto).toContain("Dentista");
    expect(corpoLogado.texto).toContain("Viagem de Natal");
  });
});
