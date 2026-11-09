import { RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA } from "@/adapters/calendario-em-memoria";
import { pedidoDeEscritaSeguro } from "@/lib/csrf";
import { obterCalendario } from "@/lib/calendario-app";
import {
  assinarValor,
  decidirRedirectOAuth,
  desserializarSessao,
  segredoDaSessao,
  serializarSessao,
} from "@/lib/google-oauth";
import {
  emitirProposta,
  resolverConfirmacaoPendente,
} from "@/lib/proposta-servidor";
import { avaliarSessaoGoogle } from "@/lib/sessao-google";
import type { ConfirmacaoPendente } from "@/domain/confirmacao";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const SECRET = "segredo-aes-de-teste-com-32b-ok!";
const ENV = {
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_TOKEN_SECRET: SECRET,
};

const AGORA = DateTime.fromObject(
  { year: 2025, month: 11, day: 6, hour: 10 },
  { zone: "America/Sao_Paulo" },
);

const PROPOSTA: ConfirmacaoPendente = {
  acao: "cancelar_pontual",
  id: "primary:evt-secreto",
  titulo: "Reunião",
  inicio: "2025-11-15T15:00:00.000-03:00",
  fim: "2025-11-15T16:00:00.000-03:00",
};

describe("reconciliação autenticação real + cookie AES", () => {
  it("cookie AES com e-mail só conecta depois do userinfo autêntico", async () => {
    const agora = Date.now();
    const pacote = serializarSessao(
      {
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: agora + 3_600_000,
        email: "stale@example.com",
      },
      SECRET,
      agora,
    );
    const tokens = desserializarSessao(pacote, SECRET, agora + 1_000);
    expect(tokens?.refreshToken).toBe("rt");
    expect(tokens?.email).toBe("stale@example.com");

    const status = await avaliarSessaoGoogle({
      tokens,
      env: ENV,
      fetchFn: async (input) => {
        expect(String(input)).toContain("userinfo");
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

  it("secret ausente ou curto em produção não cai no client secret", () => {
    expect(() =>
      segredoDaSessao({
        NODE_ENV: "production",
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
      }),
    ).toThrow(/GOOGLE_TOKEN_SECRET/);
    expect(() =>
      segredoDaSessao({
        NODE_ENV: "production",
        GOOGLE_TOKEN_SECRET: "ainda-curto",
      }),
    ).toThrow(/GOOGLE_TOKEN_SECRET/);
  });

  it("secret inválido não lê a sessão AES — fica desconectado", async () => {
    const agora = Date.now();
    const pacote = serializarSessao(
      {
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: agora + 3_600_000,
        email: "dono@example.com",
      },
      SECRET,
      agora,
    );
    expect(desserializarSessao(pacote, "outro-secret-com-32-bytes-ok!!!")).toBeNull();
    const status = await avaliarSessaoGoogle({
      tokens: desserializarSessao(pacote, "outro-secret-com-32-bytes-ok!!!"),
      env: ENV,
    });
    expect(status).toMatchObject({
      conectado: false,
      motivo: "ausente",
      email: null,
    });
  });

  it("sessão HMAC antiga, expirada ou ociosa não aparece como conectada", async () => {
    const hmac = assinarValor(
      JSON.stringify({
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: Date.now() + 3_600_000,
      }),
      SECRET,
    );
    expect(desserializarSessao(hmac, SECRET)).toBeNull();
    await expect(
      avaliarSessaoGoogle({
        tokens: desserializarSessao(hmac, SECRET),
        env: ENV,
      }),
    ).resolves.toMatchObject({ conectado: false, motivo: "ausente" });

    const agora = 1_000;
    const vencida = serializarSessao(
      {
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: agora + 3_600_000,
      },
      SECRET,
      agora,
    );
    expect(desserializarSessao(vencida, SECRET, agora + 8 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("refresh inválido no Google apaga a sessão em vez de fingir conectado", async () => {
    const agora = Date.now();
    const tokens = desserializarSessao(
      serializarSessao(
        {
          accessToken: "at-velho",
          refreshToken: "rt-morto",
          expiraEmMs: 1,
        },
        SECRET,
        agora,
      ),
      SECRET,
      agora + 1,
    );
    const status = await avaliarSessaoGoogle({
      tokens,
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

  it("confirmação só vale no cookie AES do servidor; o corpo do cliente é ignorado", () => {
    const pacote = emitirProposta(PROPOSTA, "sessao-aes", SECRET, 1_000);
    const forjada: ConfirmacaoPendente = {
      ...PROPOSTA,
      id: "escondida:evento-alheio",
    };
    expect(
      resolverConfirmacaoPendente(pacote, forjada, "sessao-aes", SECRET, 2_000),
    ).toEqual(PROPOSTA);
    expect(
      resolverConfirmacaoPendente(undefined, forjada, "sessao-aes", SECRET, 2_000),
    ).toBeNull();
    expect(
      resolverConfirmacaoPendente(pacote, forjada, "outra-sessao", SECRET, 2_000),
    ).toBeNull();
  });

  it("demonstração continua somente leitura mesmo com credencial Google no servidor", async () => {
    const calendario = obterCalendario({
      agora: AGORA,
      env: {
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      },
    });
    await expect(
      calendario.criar({
        tipo: "periodo",
        titulo: "Segredo",
        primeiroDia: "2025-11-08",
        ultimoDia: "2025-11-08",
      }),
    ).rejects.toMatchObject({ message: RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA });
  });

  it("Preview sem GOOGLE_REDIRECT_URI usa callback same-origin; host divergente é recusado", () => {
    const preview = "https://agenda-flow-git-pr7-nilteras-projects.vercel.app";
    const producao =
      "https://agenda-flow-mu.vercel.app/api/auth/google/callback";
    expect(
      decidirRedirectOAuth(preview, {
        VERCEL_ENV: "preview",
        GOOGLE_REDIRECT_URI: "",
      }),
    ).toEqual({
      ok: true,
      uri: `${preview}/api/auth/google/callback`,
    });
    expect(
      decidirRedirectOAuth(preview, { GOOGLE_REDIRECT_URI: producao }),
    ).toEqual({ ok: false, motivo: "host_divergente" });
  });

  it("escrita da conversa e do logout exige JSON same-origin", () => {
    const url = "https://agenda-flow-mu.vercel.app/api/conversa";
    expect(
      pedidoDeEscritaSeguro(
        new Request(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://agenda-flow-mu.vercel.app",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBe(true);
    expect(
      pedidoDeEscritaSeguro(
        new Request(url, {
          method: "POST",
          headers: {
            origin: "https://evil.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toBe(false);
  });
});
