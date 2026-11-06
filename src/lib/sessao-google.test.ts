import { avaliarSessaoGoogle } from "@/lib/sessao-google";
import { serializarSessao, desserializarSessao } from "@/lib/google-oauth";
import { describe, expect, it } from "vitest";

const ENV = {
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

const TOKENS = {
  accessToken: "at",
  refreshToken: "rt",
  expiraEmMs: Date.now() + 3_600_000,
};

describe("avaliação da sessão Google", () => {
  it("não marca conectado sem cookie ou sem credencial", async () => {
    await expect(
      avaliarSessaoGoogle({ tokens: null, env: ENV }),
    ).resolves.toMatchObject({ conectado: false, motivo: "ausente" });
    await expect(
      avaliarSessaoGoogle({ tokens: TOKENS, env: {} }),
    ).resolves.toMatchObject({ conectado: false, motivo: "configuracao" });
  });

  it("conecta com o e-mail do userinfo, sem usar id de agenda", async () => {
    const status = await avaliarSessaoGoogle({
      tokens: TOKENS,
      env: ENV,
      fetchFn: async (input) => {
        const url = String(input);
        expect(url).not.toContain("calendarList");
        return new Response(
          JSON.stringify({ email: "dono@example.com", sub: "1" }),
          { status: 200 },
        );
      },
    });
    expect(status).toMatchObject({
      conectado: true,
      email: "dono@example.com",
      apagarCookie: false,
    });
  });

  it("cookie com refresh inválido deixa de aparecer como conectado e pede para apagar", async () => {
    const status = await avaliarSessaoGoogle({
      tokens: { ...TOKENS, expiraEmMs: 1 },
      env: ENV,
      fetchFn: async () => new Response("invalid_grant", { status: 400 }),
    });
    expect(status).toMatchObject({
      conectado: false,
      motivo: "reconectar",
      apagarCookie: true,
      email: null,
    });
  });

  it("token antigo sem userinfo ainda conecta se o Calendário responder, sem inventar e-mail", async () => {
    const status = await avaliarSessaoGoogle({
      tokens: TOKENS,
      env: ENV,
      fetchFn: async (input) => {
        const url = String(input);
        if (url.includes("userinfo")) {
          return new Response("forbidden", { status: 403 });
        }
        if (url.includes("calendarList")) {
          return new Response(JSON.stringify({ items: [{ id: "primary@example.com" }] }), {
            status: 200,
          });
        }
        return new Response("no", { status: 500 });
      },
    });
    expect(status.conectado).toBe(true);
    expect(status.email).toBeNull();
  });

  it("sessão assinada antiga sem e-mail continua lendo os tokens", () => {
    const pacote = serializarSessao(TOKENS, "segredo");
    const lida = desserializarSessao(pacote, "segredo");
    expect(lida?.refreshToken).toBe("rt");
    expect(lida?.email ?? null).toBeNull();
  });
});
