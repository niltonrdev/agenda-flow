import { comCachePrivado } from "@/lib/cabecalhos-privados";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  opcoesCookieApagado,
  opcoesCookieSessaoAgora,
  segredoDaSessao,
  serializarSessao,
} from "@/lib/google-oauth";
import { avaliarSessaoGoogle } from "@/lib/sessao-google";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configurada = credencialGoogleConfigurada();
  if (!configurada) {
    return comCachePrivado(
      NextResponse.json({
        credencialConfigurada: false,
        conectado: false,
        email: null,
        motivo: "configuracao",
      }),
    );
  }

  const jar = await cookies();
  let tokens = null;
  try {
    tokens = desserializarSessao(
      jar.get(cookiesOAuth.sessao)?.value,
      segredoDaSessao(),
    );
  } catch {
    return comCachePrivado(
      NextResponse.json({
        credencialConfigurada: true,
        conectado: false,
        email: null,
        motivo: "configuracao",
      }),
    );
  }

  let renovados = tokens;
  const status = await avaliarSessaoGoogle({
    tokens,
    aoRenovar: (t) => {
      renovados = t;
    },
  });

  const resposta = NextResponse.json({
    credencialConfigurada: true,
    conectado: status.conectado,
    email: status.conectado ? status.email : null,
    motivo: status.motivo,
  });

  if (status.apagarCookie) {
    resposta.cookies.set(
      cookiesOAuth.sessao,
      "",
      opcoesCookieApagado(cookiesOAuth.opcoesSessao),
    );
  } else if (status.conectado && status.tokens) {
    const vigentes = {
      ...status.tokens,
      email: status.tokens.email ?? renovados?.email ?? null,
    };
    try {
      resposta.cookies.set(
        cookiesOAuth.sessao,
        serializarSessao(vigentes, segredoDaSessao()),
        opcoesCookieSessaoAgora(),
      );
    } catch {
      // Sem secret válido não regrava o cookie.
    }
  }

  return comCachePrivado(resposta);
}
