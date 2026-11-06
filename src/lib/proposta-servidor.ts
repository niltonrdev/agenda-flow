import {
  ehConfirmacaoPendente,
  type ConfirmacaoPendente,
} from "@/domain/confirmacao";
import { cifrarValor, decifrarValor } from "@/lib/criptografia";
import { createHash, randomBytes } from "node:crypto";

export const MAX_AGE_PROPOSTA_MS = 15 * 60 * 1000;

export type PropostaServidor = {
  jti: string;
  iat: number;
  exp: number;
  sessao: string;
  proposta: ConfirmacaoPendente;
};

export function digitalSessao(
  refreshToken: string | null | undefined,
): string {
  if (!refreshToken) return "demo";
  return createHash("sha256").update(refreshToken, "utf8").digest("base64url");
}

export function emitirProposta(
  proposta: ConfirmacaoPendente,
  sessao: string,
  secret: string,
  agora = Date.now(),
): string {
  const corpo: PropostaServidor = {
    jti: randomBytes(16).toString("hex"),
    iat: agora,
    exp: agora + MAX_AGE_PROPOSTA_MS,
    sessao,
    proposta,
  };
  return cifrarValor(JSON.stringify(corpo), secret);
}

export function lerProposta(
  pacote: string | undefined,
  sessao: string,
  secret: string,
  agora = Date.now(),
): ConfirmacaoPendente | null {
  const valor = decifrarValor(pacote, secret);
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor) as Partial<PropostaServidor>;
    if (
      typeof parsed.jti !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.sessao !== "string" ||
      parsed.exp <= agora ||
      parsed.sessao !== sessao ||
      !ehConfirmacaoPendente(parsed.proposta)
    ) {
      return null;
    }
    return parsed.proposta;
  } catch {
    return null;
  }
}

/**
 * A proposta do corpo do cliente é ignorada: só vale a cópia
 * cifrada emitida pelo servidor.
 */
export function resolverConfirmacaoPendente(
  pacoteCookie: string | undefined,
  _corpoCliente: unknown,
  sessao: string,
  secret: string,
  agora = Date.now(),
): ConfirmacaoPendente | null {
  return lerProposta(pacoteCookie, sessao, secret, agora);
}
