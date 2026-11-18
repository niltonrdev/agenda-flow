import { POST } from "@/app/api/conversa/route";
import { resetarRateLimitParaTestes } from "@/lib/rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

function pedido(mensagem: string, extra: Record<string, unknown> = {}) {
  return new Request("https://preview.example/api/conversa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://preview.example",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ mensagem, demonstracao: true, ...extra }),
  });
}

describe("API conversa no modo demonstração", () => {
  const envAntes = { ...process.env };

  beforeEach(() => {
    resetarRateLimitParaTestes();
    process.env.NODE_ENV = "production";
    delete process.env.GOOGLE_TOKEN_SECRET;
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret-com-mais-de-32-caracteres-ok";
  });

  afterEach(() => {
    process.env = { ...envAntes };
  });

  it("lista dezembro mesmo sem GOOGLE_TOKEN_SECRET e sem chamar o Google", async () => {
    const resposta = await POST(pedido("mostrar eventos de dezembro"));
    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as { texto?: string; erro?: string };
    expect(corpo.erro).toBeUndefined();
    expect(corpo.texto).not.toMatch(/servidor ainda não está pronto/i);
    expect(corpo.texto).toMatch(/Compromissos de dezembro|Almoço de equipe|Viagem de Natal/);
  });

  it("consulta 12/12 no seed de exemplo", async () => {
    const resposta = await POST(pedido("dia 12/12"));
    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as { texto?: string };
    expect(corpo.texto).toContain("Almoço de equipe");
  });

  it("no modo demo o título não fica com a preposição da data", async () => {
    const resposta = await POST(
      pedido("Marcar almoço com Tamires para 22/11 às 12 horas"),
    );
    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as {
      texto?: string;
      confirmacaoPendente?: { titulo?: string };
    };
    expect(corpo.confirmacaoPendente?.titulo).toBe("Almoço com Tamires");
    expect(corpo.texto).toMatch(/Almoço com Tamires/);
    expect(corpo.texto).not.toMatch(/Almoço com Tamires para/);
  });
});
