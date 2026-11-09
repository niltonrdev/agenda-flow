import {
  falhaDeHttpGoogle,
  falhaDoCalendario,
  FalhaDoCalendario,
  type CodigoFalhaCalendario,
} from "@/domain/falha-calendario";
import {
  criarObterAccessToken,
  credencialGoogleConfigurada,
  obterIdentidadeGoogle,
  type EnvOAuth,
  type TokensGoogle,
} from "@/lib/google-oauth";

export type StatusSessaoGoogle = {
  conectado: boolean;
  email: string | null;
  motivo: CodigoFalhaCalendario | "ausente" | null;
  apagarCookie: boolean;
  tokens: TokensGoogle | null;
};

const AUSENTE: StatusSessaoGoogle = {
  conectado: false,
  email: null,
  motivo: "ausente",
  apagarCookie: false,
  tokens: null,
};

async function calendarioResponde(
  accessToken: string,
  fetchFn: typeof fetch,
): Promise<boolean> {
  const resposta = await fetchFn(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1&minAccessRole=reader",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (resposta.ok) return true;
  throw falhaDeHttpGoogle(resposta.status);
}

/**
 * Cookie válido não basta: confirma o token no Google.
 * O e-mail vem só do userinfo (openid), nunca do id da agenda.
 */
export async function avaliarSessaoGoogle(opcoes: {
  tokens: TokensGoogle | null;
  env?: EnvOAuth;
  fetchFn?: typeof fetch;
  aoRenovar?: (tokens: TokensGoogle) => void;
}): Promise<StatusSessaoGoogle> {
  const env = opcoes.env ?? (process.env as EnvOAuth);
  if (!credencialGoogleConfigurada(env)) {
    return {
      conectado: false,
      email: null,
      motivo: "configuracao",
      apagarCookie: false,
      tokens: null,
    };
  }
  if (!opcoes.tokens?.refreshToken) return AUSENTE;

  const fetchFn = opcoes.fetchFn ?? fetch;
  let tokens = opcoes.tokens;
  const obterToken = criarObterAccessToken({
    tokens,
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    fetchFn,
    aoRenovar: (renovados) => {
      tokens = { ...renovados, email: tokens.email };
      opcoes.aoRenovar?.(tokens);
    },
  });

  let accessToken: string;
  try {
    accessToken = await obterToken();
  } catch (erro) {
    if (erro instanceof FalhaDoCalendario && erro.codigo === "reconectar") {
      return {
        conectado: false,
        email: null,
        motivo: "reconectar",
        apagarCookie: true,
        tokens: null,
      };
    }
    return {
      conectado: false,
      email: null,
      motivo: "temporaria",
      apagarCookie: false,
      tokens,
    };
  }

  try {
    const email = await obterIdentidadeGoogle({ accessToken, fetchFn });
    return {
      conectado: true,
      email,
      motivo: null,
      apagarCookie: false,
      tokens: { ...tokens, email: email ?? tokens.email ?? null },
    };
  } catch (erro) {
    const codigo =
      erro instanceof FalhaDoCalendario ? erro.codigo : "temporaria";
    if (codigo === "temporaria") {
      return {
        conectado: false,
        email: null,
        motivo: "temporaria",
        apagarCookie: false,
        tokens,
      };
    }
    try {
      await calendarioResponde(accessToken, fetchFn);
      return {
        conectado: true,
        email: tokens.email ?? null,
        motivo: null,
        apagarCookie: false,
        tokens,
      };
    } catch (calErro) {
      const calCodigo =
        calErro instanceof FalhaDoCalendario ? calErro.codigo : "temporaria";
      if (calCodigo === "reconectar") {
        return {
          conectado: false,
          email: null,
          motivo: "reconectar",
          apagarCookie: true,
          tokens: null,
        };
      }
      return {
        conectado: false,
        email: null,
        motivo: calCodigo === "permissao" ? "permissao" : "temporaria",
        apagarCookie: false,
        tokens,
      };
    }
  }
}

export function mensagemDeMotivo(
  motivo: StatusSessaoGoogle["motivo"],
): string | null {
  if (motivo === "reconectar") return falhaDoCalendario("reconectar").message;
  if (motivo === "permissao") return falhaDoCalendario("permissao").message;
  if (motivo === "temporaria") {
    return "Não foi possível confirmar a conexão com o Google agora. Tente de novo em instantes.";
  }
  if (motivo === "configuracao") return falhaDoCalendario("configuracao").message;
  return null;
}
