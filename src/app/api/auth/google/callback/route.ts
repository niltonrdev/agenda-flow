import { comCachePrivado } from "@/lib/cabecalhos-privados";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  decidirRedirectOAuth,
  obterIdentidadeGoogle,
  opcoesCookieApagado,
  opcoesCookieSessaoAgora,
  segredoDaSessao,
  serializarSessao,
  trocarCodigoPorTokens,
} from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origem = url.origin;
  const erroAuth = url.searchParams.get("error");
  if (erroAuth) {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=negado", origem)),
    );
  }

  if (!credencialGoogleConfigurada()) {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=falha", origem)),
    );
  }

  const decisao = decidirRedirectOAuth(origem);
  if (!decisao.ok) {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=host", origem)),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const stateEsperado = jar.get(cookiesOAuth.state)?.value;

  if (!code || !state || !stateEsperado || state !== stateEsperado) {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=falha", origem)),
    );
  }

  try {
    const tokens = await trocarCodigoPorTokens({
      code,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: decisao.uri,
    });
    if (!tokens.refreshToken) {
      return comCachePrivado(
        NextResponse.redirect(new URL("/api/auth/google?consent=1", origem)),
      );
    }

    let email: string | null = null;
    try {
      email = await obterIdentidadeGoogle({ accessToken: tokens.accessToken });
    } catch {
      email = null;
    }

    const resposta = NextResponse.redirect(new URL("/?google=ok", origem));
    resposta.cookies.set(
      cookiesOAuth.sessao,
      serializarSessao({ ...tokens, email }, segredoDaSessao()),
      opcoesCookieSessaoAgora(),
    );
    resposta.cookies.set(
      cookiesOAuth.state,
      "",
      opcoesCookieApagado(cookiesOAuth.opcoesState),
    );
    return comCachePrivado(resposta);
  } catch {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=falha", origem)),
    );
  }
}
