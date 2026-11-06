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
    return NextResponse.json({
      credencialConfigurada: false,
      conectado: false,
      email: null,
      motivo: "configuracao",
    });
  }

  const jar = await cookies();
  const tokens = desserializarSessao(
    jar.get(cookiesOAuth.sessao)?.value,
    segredoDaSessao(),
  );

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
    const vigentes = status.tokens.email
      ? status.tokens
      : { ...status.tokens, email: renovados?.email ?? null };
    resposta.cookies.set(
      cookiesOAuth.sessao,
      serializarSessao(vigentes, segredoDaSessao()),
      opcoesCookieSessaoAgora(),
    );
  }

  return resposta;
}
