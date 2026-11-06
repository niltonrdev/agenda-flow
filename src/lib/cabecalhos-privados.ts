import { NextResponse } from "next/server";

export const CABECALHOS_PRIVADOS: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export function comCachePrivado(resposta: NextResponse): NextResponse {
  for (const [chave, valor] of Object.entries(CABECALHOS_PRIVADOS)) {
    resposta.headers.set(chave, valor);
  }
  return resposta;
}
