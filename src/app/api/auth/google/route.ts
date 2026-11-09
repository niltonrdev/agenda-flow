import { comCachePrivado } from "@/lib/cabecalhos-privados";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  decidirRedirectOAuth,
  opcoesCookieStateAgora,
  urlDeAutorizacao,
} from "@/lib/google-oauth";
import { RATE_OAUTH_POR_MINUTO } from "@/lib/limites";
import { chaveCliente, consumirRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limite = consumirRateLimit(
    `oauth:${chaveCliente(request)}`,
    RATE_OAUTH_POR_MINUTO,
  );
  if (!limite.ok) {
    const resposta = NextResponse.json(
      { erro: "Muitas tentativas. Espere um pouco e tente de novo." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterS) } },
    );
    return comCachePrivado(resposta);
  }

  if (!credencialGoogleConfigurada()) {
    return comCachePrivado(
      NextResponse.json(
        { erro: "O servidor ainda não está pronto para o Google." },
        { status: 501 },
      ),
    );
  }

  const pedido = new URL(request.url);
  const origem = pedido.origin;
  const decisao = decidirRedirectOAuth(origem);
  if (!decisao.ok) {
    return comCachePrivado(
      NextResponse.redirect(new URL("/?google=host", origem)),
    );
  }

  const state = randomBytes(16).toString("hex");
  const url = urlDeAutorizacao({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: decisao.uri,
    state,
    forcarConsentimento: pedido.searchParams.get("consent") === "1",
  });

  const resposta = NextResponse.redirect(url);
  resposta.cookies.set(cookiesOAuth.state, state, opcoesCookieStateAgora());
  return comCachePrivado(resposta);
}
