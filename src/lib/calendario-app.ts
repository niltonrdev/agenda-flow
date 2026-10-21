import { criarCalendarioDeDemonstracao } from "@/adapters/calendario-em-memoria";
import { criarCalendarioGoogle } from "@/adapters/calendario-google";
import { criarClienteCalendarioGoogle } from "@/adapters/cliente-calendario-google";
import type { Calendario } from "@/domain/calendario";
import { FUSO_DONO } from "@/domain/fuso";
import {
  credencialGoogleConfigurada,
  criarObterAccessToken,
  type TokensGoogle,
} from "@/lib/google-oauth";
import { DateTime } from "luxon";

let calendarioMemoria: Calendario | null = null;

export type OpcoesCalendarioApp = {
  agora?: DateTime;
  tokens?: TokensGoogle | null;
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  aoRenovarTokens?: (tokens: TokensGoogle) => void;
};

/**
 * Sem credencial ou sem sessão Google: adaptador em memória semeado.
 * Com OAuth do Dono: adaptador Google (lê visíveis, grava na principal).
 */
export function obterCalendario(opcoes: OpcoesCalendarioApp = {}): Calendario {
  const env = opcoes.env ?? (process.env as Record<string, string | undefined>);
  if (credencialGoogleConfigurada(env) && opcoes.tokens) {
    const clientId = env.GOOGLE_CLIENT_ID!;
    const clientSecret = env.GOOGLE_CLIENT_SECRET!;
    return criarCalendarioGoogle(
      criarClienteCalendarioGoogle({
        fetch: opcoes.fetchFn,
        obterAccessToken: criarObterAccessToken({
          tokens: opcoes.tokens,
          clientId,
          clientSecret,
          fetchFn: opcoes.fetchFn,
          aoRenovar: opcoes.aoRenovarTokens,
        }),
      }),
    );
  }

  const agora = opcoes.agora ?? DateTime.now().setZone(FUSO_DONO);
  if (!calendarioMemoria) {
    calendarioMemoria = criarCalendarioDeDemonstracao(agora);
  }
  return calendarioMemoria;
}
