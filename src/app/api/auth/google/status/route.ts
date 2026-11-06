import { comCachePrivado } from "@/lib/cabecalhos-privados";
import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  segredoDaSessao,
} from "@/lib/google-oauth";
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
      }),
    );
  }

  const jar = await cookies();
  let conectado = false;
  try {
    const sessao = desserializarSessao(
      jar.get(cookiesOAuth.sessao)?.value,
      segredoDaSessao(),
    );
    conectado = Boolean(sessao?.refreshToken);
  } catch {
    conectado = false;
  }

  return comCachePrivado(
    NextResponse.json({
      credencialConfigurada: true,
      conectado,
    }),
  );
}
