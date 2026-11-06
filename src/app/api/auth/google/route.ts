import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  decidirRedirectOAuth,
  opcoesCookieStateAgora,
  urlDeAutorizacao,
} from "@/lib/google-oauth";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!credencialGoogleConfigurada()) {
    return NextResponse.json(
      { erro: "O servidor ainda não está pronto para o Google." },
      { status: 501 },
    );
  }

  const pedido = new URL(request.url);
  const origem = pedido.origin;
  const decisao = decidirRedirectOAuth(origem);
  if (!decisao.ok) {
    return NextResponse.redirect(new URL("/?google=host", origem));
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
  return resposta;
}
