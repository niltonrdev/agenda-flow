import {
  assinarValor,
  desserializarSessao,
  lerValorAssinado,
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

  it("pede acesso offline para a sessão durar", () => {
    const url = urlDeAutorizacao({
      clientId: "id",
      redirectUri: "http://localhost:3000/api/auth/google/callback",
      state: "abc",
    });
    expect(url).toContain("access_type=offline");
    expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar");
  });
});
