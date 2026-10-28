import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  opcoesCookieStateAgora,
  resolverRedirectUri,
  urlDeAutorizacao,
} from "@/lib/google-oauth";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!credencialGoogleConfigurada()) {
    return NextResponse.json(
      { erro: "Conta Google não configurada neste servidor." },
      { status: 501 },
    );
  }

  const pedido = new URL(request.url);
  const origem = pedido.origin;
  const state = randomBytes(16).toString("hex");
  const url = urlDeAutorizacao({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: resolverRedirectUri(origem),
    state,
    forcarConsentimento: pedido.searchParams.get("consent") === "1",
  });

  const resposta = NextResponse.redirect(url);
  resposta.cookies.set(cookiesOAuth.state, state, opcoesCookieStateAgora());
  return resposta;
}
