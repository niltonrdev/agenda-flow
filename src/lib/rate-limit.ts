type Balde = { contagem: number; reiniciaEm: number };

const baldes = new Map<string, Balde>();

export function chaveCliente(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) {
    return encaminhado.split(",")[0]?.trim() || "desconhecido";
  }
  return request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

/**
 * Contador em memória por instância. Em serverless não é global,
 * mas barre rajadas no mesmo isolado.
 */
export function consumirRateLimit(
  chave: string,
  limite: number,
  janelaMs = 60_000,
  agora = Date.now(),
): { ok: boolean; retryAfterS: number } {
  const atual = baldes.get(chave);
  if (!atual || atual.reiniciaEm <= agora) {
    baldes.set(chave, { contagem: 1, reiniciaEm: agora + janelaMs });
    return { ok: true, retryAfterS: Math.ceil(janelaMs / 1000) };
  }
  if (atual.contagem >= limite) {
    return {
      ok: false,
      retryAfterS: Math.max(1, Math.ceil((atual.reiniciaEm - agora) / 1000)),
    };
  }
  atual.contagem += 1;
  return { ok: true, retryAfterS: Math.ceil((atual.reiniciaEm - agora) / 1000) };
}

export function resetarRateLimitParaTestes(): void {
  baldes.clear();
}
