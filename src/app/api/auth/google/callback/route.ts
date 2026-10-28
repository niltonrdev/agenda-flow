import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  opcoesCookieSessaoAgora,
  resolverRedirectUri,
  segredoDaSessao,
  serializarSessao,
  trocarCodigoPorTokens,
} from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origem = url.origin;
  const erroAuth = url.searchParams.get("error");
  if (erroAuth) {
    return NextResponse.redirect(new URL("/?google=negado", origem));
  }

  if (!credencialGoogleConfigurada()) {
    return NextResponse.redirect(new URL("/?google=falha", origem));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const stateEsperado = jar.get(cookiesOAuth.state)?.value;

  if (!code || !state || !stateEsperado || state !== stateEsperado) {
    return NextResponse.redirect(new URL("/?google=falha", origem));
  }

  try {
    const tokens = await trocarCodigoPorTokens({
      code,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: resolverRedirectUri(origem),
    });
    if (!tokens.refreshToken) {
      // Sem refresh_token a sessão não dura; pede consentimento uma vez.
      return NextResponse.redirect(new URL("/api/auth/google?consent=1", origem));
    }

    const resposta = NextResponse.redirect(new URL("/?google=ok", origem));
    resposta.cookies.set(
      cookiesOAuth.sessao,
      serializarSessao(tokens, segredoDaSessao()),
      opcoesCookieSessaoAgora(),
    );
    resposta.cookies.set(cookiesOAuth.state, "", {
      ...cookiesOAuth.opcoesState,
      maxAge: 0,
      expires: new Date(0),
    });
    return resposta;
  } catch {
    return NextResponse.redirect(new URL("/?google=falha", origem));
  }
}
