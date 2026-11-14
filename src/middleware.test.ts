import { middleware } from "@/middleware";
import { CAMINHO_CONVERSA, CAMINHO_PRIVACIDADE, CAMINHO_TERMOS } from "@/lib/urls-app";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

function pedido(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe("middleware das páginas públicas", () => {
  const env = process.env as Record<string, string | undefined>;
  const original = {
    REDIRECT: env.REDIRECT_VERCEL_PARA_CANONICO,
    VERCEL_ENV: env.VERCEL_ENV,
    APP_ORIGIN: env.APP_ORIGIN,
  };

  afterEach(() => {
    if (original.REDIRECT === undefined) delete env.REDIRECT_VERCEL_PARA_CANONICO;
    else env.REDIRECT_VERCEL_PARA_CANONICO = original.REDIRECT;
    if (original.VERCEL_ENV === undefined) delete env.VERCEL_ENV;
    else env.VERCEL_ENV = original.VERCEL_ENV;
    if (original.APP_ORIGIN === undefined) delete env.APP_ORIGIN;
    else env.APP_ORIGIN = original.APP_ORIGIN;
  });

  it("não exige login em /, /privacidade, /termos nem /conversa", () => {
    for (const path of ["/", CAMINHO_PRIVACIDADE, CAMINHO_TERMOS, CAMINHO_CONVERSA]) {
      const resposta = middleware(
        pedido(`https://agendainteligente.net.br${path}`),
      );
      expect(resposta.status).not.toBe(401);
      expect(resposta.status).not.toBe(403);
      expect(resposta.headers.get("location")).toBeNull();
    }
  });

  it("com a flag ligada, redireciona a homepage de produção vercel.app", () => {
    env.REDIRECT_VERCEL_PARA_CANONICO = "1";
    env.VERCEL_ENV = "production";
    env.APP_ORIGIN = "https://agendainteligente.net.br";
    const resposta = middleware(
      pedido("https://agenda-flow-mu.vercel.app/"),
    );
    expect(resposta.status).toBe(308);
    expect(resposta.headers.get("location")).toBe(
      "https://agendainteligente.net.br/",
    );
  });

  it("não redireciona callback OAuth nem preview", () => {
    env.REDIRECT_VERCEL_PARA_CANONICO = "1";
    env.VERCEL_ENV = "production";
    env.APP_ORIGIN = "https://agendainteligente.net.br";
    const callback = middleware(
      pedido(
        "https://agenda-flow-mu.vercel.app/api/auth/google/callback?code=abc",
      ),
    );
    expect(callback.headers.get("location")).toBeNull();

    env.VERCEL_ENV = "preview";
    const preview = middleware(
      pedido("https://agenda-flow-git-x-nilteras-projects.vercel.app/"),
    );
    expect(preview.headers.get("location")).toBeNull();
  });
});
