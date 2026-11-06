import {
  assinarValor,
  CAMINHO_CALLBACK_OAUTH,
  decidirRedirectOAuth,
  desserializarSessao,
  emailPublicavel,
  ESCOPOS_OAUTH,
  lerValorAssinado,
  MAX_AGE_SESSAO_S,
  MENSAGEM_OAUTH_HOST,
  OCIOSIDADE_SESSAO_MS,
  resolverRedirectUri,
  revogarTokenGoogle,
  segredoDaSessao,
  serializarSessao,
  urlDeAutorizacao,
} from "@/lib/google-oauth";
import { describe, expect, it } from "vitest";

const SECRET = "segredo-de-teste-com-32-bytes-ok!";

describe("sessão Google persistida", () => {
  it("cifra e lê de volta os tokens entre visitas", () => {
    const tokens = {
      accessToken: "at",
      refreshToken: "rt",
      expiraEmMs: 1_700_000_000_000,
      email: "dono@example.com",
    };
    const agora = 1_700_000_000_000 - 60_000;
    const pacote = serializarSessao(tokens, SECRET, agora);
    expect(pacote.startsWith("v1.")).toBe(true);
    expect(pacote).not.toContain("at");
    expect(pacote).not.toContain("rt");
    expect(pacote).not.toContain("dono@example.com");
    expect(desserializarSessao(pacote, SECRET, agora + 1_000)).toEqual({
      ...tokens,
      iat: agora,
      exp: agora + MAX_AGE_SESSAO_S * 1000,
    });
    expect(
      desserializarSessao(pacote, "outro-segredo-com-32-bytes-ok!!", agora + 1_000),
    ).toBeNull();
  });

  it("rejeita o formato antigo só assinado e o pacote adulterado", () => {
    const hmac = assinarValor("ola", SECRET);
    expect(desserializarSessao(hmac, SECRET)).toBeNull();
    expect(lerValorAssinado(hmac.slice(0, -1) + "x", SECRET)).toBeNull();
  });

  it("rejeita sessão com expiração absoluta ou ociosidade vencidas", () => {
    const agora = 1_000;
    const pacote = serializarSessao(
      {
        accessToken: "at",
        refreshToken: "rt",
        expiraEmMs: agora + 3_600_000,
      },
      SECRET,
      agora,
    );
    expect(
      desserializarSessao(pacote, SECRET, agora + MAX_AGE_SESSAO_S * 1000 + 1),
    ).toBeNull();
    expect(
      desserializarSessao(pacote, SECRET, agora + OCIOSIDADE_SESSAO_MS + 1),
    ).toBeNull();
  });

  it("pede identidade + events + calendarlist, sem o escopo amplo de administrar agendas", () => {
    const url = urlDeAutorizacao({
      clientId: "id",
      redirectUri: "http://localhost:3000/api/auth/google/callback",
      state: "abc",
    });
    expect(url).toContain("access_type=offline");
    expect(url).toContain("include_granted_scopes=false");
    expect(url).not.toContain("prompt=");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback",
    );
    for (const escopo of ESCOPOS_OAUTH) {
      expect(url).toContain(encodeURIComponent(escopo));
    }
    expect(url).not.toMatch(/auth%2Fcalendar(?:&|$)/);
    expect(CAMINHO_CALLBACK_OAUTH).toBe("/api/auth/google/callback");
  });

  it("só pede prompt=consent quando forçamos o refresh_token", () => {
    const url = urlDeAutorizacao({
      clientId: "id",
      redirectUri: "http://localhost:3000/api/auth/google/callback",
      state: "abc",
      forcarConsentimento: true,
    });
    expect(url).toContain("prompt=consent");
  });

  it("GOOGLE_REDIRECT_URI vazio cai no callback da origem", () => {
    expect(
      resolverRedirectUri("http://localhost:3000", {
        GOOGLE_REDIRECT_URI: "",
      }),
    ).toBe("http://localhost:3000/api/auth/google/callback");
  });

  it("preview sem GOOGLE_REDIRECT_URI usa callback same-origin; variável de outro host é recusada", () => {
    const preview = "https://agenda-flow-git-x-nilteras-projects.vercel.app";
    const producao =
      "https://agenda-flow-mu.vercel.app/api/auth/google/callback";
    expect(decidirRedirectOAuth(preview, { VERCEL_ENV: "preview" })).toEqual({
      ok: true,
      uri: `${preview}/api/auth/google/callback`,
    });
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
    expect(
      decidirRedirectOAuth("https://agenda-flow-mu.vercel.app", {
        GOOGLE_REDIRECT_URI: producao,
      }),
    ).toEqual({ ok: true, uri: producao });
    expect(MENSAGEM_OAUTH_HOST).toMatch(/produção/i);
  });

  it("só aceita e-mail com formato de endereço, sem id de agenda", () => {
    expect(emailPublicavel("dono@example.com")).toBe("dono@example.com");
    expect(emailPublicavel("primary")).toBeNull();
    expect(emailPublicavel("not an email")).toBeNull();
  });

  it("revoga o refresh token no Google", async () => {
    const corpos: string[] = [];
    await revogarTokenGoogle({
      token: "rt-antigo",
      fetchFn: async (_url, init) => {
        corpos.push(String(init?.body));
        return new Response(null, { status: 200 });
      },
    });
    expect(corpos[0]).toContain("token=rt-antigo");
  });

  it("em produção exige GOOGLE_TOKEN_SECRET próprio", () => {
    expect(() =>
      segredoDaSessao({
        NODE_ENV: "production",
        GOOGLE_CLIENT_SECRET: "client-secret-nao-serve-como-chave",
      }),
    ).toThrow(/GOOGLE_TOKEN_SECRET/);
    expect(() =>
      segredoDaSessao({
        NODE_ENV: "production",
        GOOGLE_TOKEN_SECRET: "curto",
        GOOGLE_CLIENT_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
      }),
    ).toThrow(/GOOGLE_TOKEN_SECRET/);
    expect(
      segredoDaSessao({
        NODE_ENV: "production",
        GOOGLE_TOKEN_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
      }),
    ).toBe("abcdefghijklmnopqrstuvwxyz012345");
  });
});
