import {
  cookiesOAuth,
  credencialGoogleConfigurada,
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

  const origem = new URL(request.url).origin;
  const state = randomBytes(16).toString("hex");
  const url = urlDeAutorizacao({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: resolverRedirectUri(origem),
    state,
  });

  const resposta = NextResponse.redirect(url);
  resposta.cookies.set(cookiesOAuth.state, state, cookiesOAuth.opcoesState);
  return resposta;
}
