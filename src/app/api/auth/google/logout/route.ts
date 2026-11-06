import { comCachePrivado } from "@/lib/cabecalhos-privados";
import { pedidoDeEscritaSeguro } from "@/lib/csrf";
import {
  cookiesOAuth,
  desserializarSessao,
  opcoesCookieApagado,
  revogarTokenGoogle,
  segredoDaSessao,
} from "@/lib/google-oauth";
import { RATE_LOGOUT_POR_MINUTO } from "@/lib/limites";
import { chaveCliente, consumirRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!pedidoDeEscritaSeguro(request)) {
    return comCachePrivado(
      NextResponse.json({ erro: "Pedido rejeitado." }, { status: 403 }),
    );
  }

  const limite = consumirRateLimit(
    `logout:${chaveCliente(request)}`,
    RATE_LOGOUT_POR_MINUTO,
  );
  if (!limite.ok) {
    return comCachePrivado(
      NextResponse.json(
        { erro: "Muitas tentativas. Espere um pouco e tente de novo." },
        { status: 429, headers: { "Retry-After": String(limite.retryAfterS) } },
      ),
    );
  }

  const jar = await cookies();
  const pacote = jar.get(cookiesOAuth.sessao)?.value;
  try {
    const sessao = desserializarSessao(pacote, segredoDaSessao());
    const token = sessao?.refreshToken || sessao?.accessToken;
    if (token) {
      await revogarTokenGoogle({ token });
    }
  } catch {
    // Apaga cookies mesmo se a cifra ou o Google falharem.
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(
    cookiesOAuth.sessao,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesSessao),
  );
  resposta.cookies.set(
    cookiesOAuth.proposta,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesProposta),
  );
  resposta.cookies.set(
    cookiesOAuth.state,
    "",
    opcoesCookieApagado(cookiesOAuth.opcoesState),
  );
  return comCachePrivado(resposta);
}
