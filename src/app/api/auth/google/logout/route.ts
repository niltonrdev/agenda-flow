import {
  cookiesOAuth,
  desserializarSessao,
  opcoesCookieApagado,
  revogarTokenGoogle,
  segredoDaSessao,
} from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ erro: "Pedido rejeitado." }, { status: 403 });
  }

  const jar = await cookies();
  const pacote = jar.get(cookiesOAuth.sessao)?.value;
  try {
    const sessao = desserializarSessao(pacote, segredoDaSessao());
    const token = sessao?.refreshToken || sessao?.accessToken;
    if (token) await revogarTokenGoogle({ token });
  } catch {
    // Apaga o cookie mesmo se o Google não responder.
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(
    cookiesOAuth.sessao,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesSessao),
  );
  resposta.cookies.set(
    cookiesOAuth.state,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesState),
  );
  return resposta;
}
