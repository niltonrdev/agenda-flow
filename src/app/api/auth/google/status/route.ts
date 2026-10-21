import {
  cookiesOAuth,
  credencialGoogleConfigurada,
  desserializarSessao,
  segredoDaSessao,
} from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const configurada = credencialGoogleConfigurada();
  if (!configurada) {
    return NextResponse.json({
      credencialConfigurada: false,
      conectado: false,
    });
  }

  const jar = await cookies();
  const sessao = desserializarSessao(
    jar.get(cookiesOAuth.sessao)?.value,
    segredoDaSessao(),
  );

  return NextResponse.json({
    credencialConfigurada: true,
    conectado: Boolean(sessao?.refreshToken),
  });
}
