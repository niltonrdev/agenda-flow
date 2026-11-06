import {
  assinarValor,
  CAMINHO_CALLBACK_OAUTH,
  decidirRedirectOAuth,
  desserializarSessao,
  emailPublicavel,
  ESCOPOS_OAUTH,
  lerValorAssinado,
  MENSAGEM_OAUTH_HOST,
  resolverRedirectUri,
  serializarSessao,
  urlDeAutorizacao,
} from "@/lib/google-oauth";
import { describe, expect, it } from "vitest";

describe("sessão Google persistida", () => {
  it("assina e lê de volta os tokens entre visitas", () => {
    const secret = "segredo-de-teste";
    const tokens = {
      accessToken: "at",
      refreshToken: "rt",
      expiraEmMs: 1_700_000_000_000,
      email: "dono@example.com",
    };
    const pacote = serializarSessao(tokens, secret);
    expect(desserializarSessao(pacote, secret)).toEqual(tokens);
    expect(desserializarSessao(pacote, "outro")).toBeNull();
  });

  it("rejeita pacote adulterado", () => {
    const secret = "segredo-de-teste";
    const pacote = assinarValor("ola", secret);
    expect(lerValorAssinado(pacote.slice(0, -1) + "x", secret)).toBeNull();
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
    expect(
      decidirRedirectOAuth(preview, { VERCEL_ENV: "preview" }),
    ).toEqual({
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
});
