import { ESCOPOS_OAUTH } from "@/lib/google-oauth";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CAMINHO_CALLBACK_OAUTH,
  CAMINHO_CONVERSA,
  CAMINHO_INICIO,
  CAMINHO_PRIVACIDADE,
  CAMINHO_TERMOS,
  caminhoEhPublico,
  caminhoExigeSessao,
  caminhoOAuthResultado,
  decidirRedirectCanonico,
  NOME_DO_APP,
  origemDoAmbiente,
  urlsPublicas,
} from "@/lib/urls-app";
import { describe, expect, it } from "vitest";

const APEX = "https://agendainteligente.net.br";

describe("derivação das URLs públicas e OAuth", () => {
  it("deriva homepage, legais, callback e origem JS a partir da origem", () => {
    const urls = urlsPublicas(APEX);
    expect(urls.inicio).toBe(`${APEX}/`);
    expect(urls.conversa).toBe(`${APEX}/conversa`);
    expect(CAMINHO_PRIVACIDADE).toBe("/privacidade");
    expect(CAMINHO_TERMOS).toBe("/termos");
    expect(urls.privacidade).toBe(`${APEX}/privacidade`);
    expect(urls.termos).toBe(`${APEX}/termos`);
    expect(urls.oauthCallback).toBe(
      `${APEX}${CAMINHO_CALLBACK_OAUTH}`,
    );
    expect(urls.origemJavascript).toBe(APEX);
    expect(NOME_DO_APP).toBe("Agenda Inteligente");
    expect(caminhoOAuthResultado("ok")).toBe("/conversa?google=ok");
    expect(ESCOPOS_OAUTH).toContain(
      "https://www.googleapis.com/auth/calendar.events",
    );
  });

  it("APP_ORIGIN, NEXT_PUBLIC_APP_ORIGIN e NEXTAUTH_URL viram só a origem", () => {
    expect(origemDoAmbiente({})).toBeNull();
    expect(origemDoAmbiente({ APP_ORIGIN: `${APEX}/` })).toBe(APEX);
    expect(
      origemDoAmbiente({ NEXT_PUBLIC_APP_ORIGIN: `${APEX}/conversa` }),
    ).toBe(APEX);
    expect(origemDoAmbiente({ NEXTAUTH_URL: APEX })).toBe(APEX);
    expect(origemDoAmbiente({ APP_ORIGIN: "nao-e-url" })).toBeNull();
  });

  it("homepage, privacidade e termos são públicos e o middleware não exige sessão", () => {
    for (const path of [CAMINHO_INICIO, CAMINHO_PRIVACIDADE, CAMINHO_TERMOS]) {
      expect(caminhoEhPublico(path)).toBe(true);
      expect(caminhoExigeSessao(path)).toBe(false);
    }
    expect(caminhoExigeSessao(CAMINHO_CONVERSA)).toBe(false);
    expect(caminhoExigeSessao("/api/auth/google")).toBe(false);
  });
});

describe("redirect opt-in de *.vercel.app para a origem canônica", () => {
  const producaoVercel = {
    host: "agenda-flow-mu.vercel.app",
    pathname: "/",
  };
  const envPronto = {
    REDIRECT_VERCEL_PARA_CANONICO: "1",
    VERCEL_ENV: "production",
    APP_ORIGIN: APEX,
  };

  it("redireciona só páginas públicas GET em produção, quando ligado", () => {
    expect(decidirRedirectCanonico(producaoVercel, envPronto)).toEqual({
      ok: true,
      destino: `${APEX}/`,
    });
    expect(
      decidirRedirectCanonico(
        { host: "agenda-flow-mu.vercel.app", pathname: "/privacidade" },
        envPronto,
      ),
    ).toEqual({ ok: true, destino: `${APEX}/privacidade` });
    expect(
      decidirRedirectCanonico(
        { host: "agenda-flow-mu.vercel.app", pathname: "/termos" },
        envPronto,
      ),
    ).toEqual({ ok: true, destino: `${APEX}/termos` });
  });

  it("não quebra preview, OAuth, Conversa nem o host já canônico", () => {
    expect(
      decidirRedirectCanonico(producaoVercel, {
        ...envPronto,
        VERCEL_ENV: "preview",
      }),
    ).toEqual({ ok: false, motivo: "nao_producao" });
    expect(
      decidirRedirectCanonico(producaoVercel, {
        APP_ORIGIN: APEX,
        VERCEL_ENV: "production",
      }),
    ).toEqual({ ok: false, motivo: "desligado" });
    expect(
      decidirRedirectCanonico(
        { host: "agenda-flow-mu.vercel.app", pathname: "/api/auth/google/callback" },
        envPronto,
      ),
    ).toEqual({ ok: false, motivo: "api" });
    expect(
      decidirRedirectCanonico(
        { host: "agenda-flow-mu.vercel.app", pathname: "/conversa" },
        envPronto,
      ),
    ).toEqual({ ok: false, motivo: "conversa" });
    expect(
      decidirRedirectCanonico(
        { host: "agendainteligente.net.br", pathname: "/" },
        envPronto,
      ),
    ).toEqual({ ok: false, motivo: "ja_canonico" });
    expect(
      decidirRedirectCanonico(
        {
          host: "agenda-flow-git-pr-nilteras-projects.vercel.app",
          pathname: "/",
        },
        { ...envPronto, VERCEL_ENV: "preview" },
      ),
    ).toEqual({ ok: false, motivo: "nao_producao" });
  });
});

describe("CSP", () => {
  it("não hardcoda o host vercel.app — a origem vem de 'self' e APP_ORIGIN", () => {
    const fonte = readFileSync(
      path.resolve(__dirname, "../../next.config.ts"),
      "utf8",
    );
    expect(fonte).not.toContain("vercel.app");
    expect(fonte).toContain("Content-Security-Policy");
    expect(fonte).toMatch(/frame-ancestors 'none'/);
  });
});
