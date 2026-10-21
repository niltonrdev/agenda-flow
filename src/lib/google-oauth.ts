import { FalhaDoCalendario } from "@/domain/falha-calendario";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_SESSAO = "agenda_google";
const COOKIE_STATE = "agenda_google_oauth_state";
const ESCOPO = "https://www.googleapis.com/auth/calendar";

export type TokensGoogle = {
  accessToken: string;
  refreshToken: string;
  expiraEmMs: number;
};

export type EnvOAuth = Record<string, string | undefined>;

export function credencialGoogleConfigurada(
  env: EnvOAuth = process.env as EnvOAuth,
): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function segredo(env: EnvOAuth = process.env as EnvOAuth): string {
  return env.GOOGLE_TOKEN_SECRET || env.GOOGLE_CLIENT_SECRET || "";
}

export function assinarValor(valor: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(valor).digest("base64url");
  return `${hmac}.${Buffer.from(valor, "utf8").toString("base64url")}`;
}

export function lerValorAssinado(pacote: string, secret: string): string | null {
  const ponto = pacote.indexOf(".");
  if (ponto <= 0) return null;
  const hmac = pacote.slice(0, ponto);
  const payload = pacote.slice(ponto + 1);
  let valor: string;
  try {
    valor = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const esperado = createHmac("sha256", secret).update(valor).digest("base64url");
  const a = Buffer.from(hmac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return valor;
}

export function serializarSessao(tokens: TokensGoogle, secret: string): string {
  return assinarValor(JSON.stringify(tokens), secret);
}

export function desserializarSessao(
  pacote: string | undefined,
  secret: string,
): TokensGoogle | null {
  if (!pacote || !secret) return null;
  const valor = lerValorAssinado(pacote, secret);
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor) as Partial<TokensGoogle>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiraEmMs !== "number"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiraEmMs: parsed.expiraEmMs,
    };
  } catch {
    return null;
  }
}

export function urlDeAutorizacao(opcoes: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opcoes.clientId,
    redirect_uri: opcoes.redirectUri,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent",
    state: opcoes.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function trocarCodigoPorTokens(opcoes: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchFn?: typeof fetch;
}): Promise<TokensGoogle> {
  return pedirTokens(
    {
      grant_type: "authorization_code",
      code: opcoes.code,
      client_id: opcoes.clientId,
      client_secret: opcoes.clientSecret,
      redirect_uri: opcoes.redirectUri,
    },
    opcoes.fetchFn ?? fetch,
  );
}

export async function renovarTokens(opcoes: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
}): Promise<TokensGoogle> {
  const renovados = await pedirTokens(
    {
      grant_type: "refresh_token",
      refresh_token: opcoes.refreshToken,
      client_id: opcoes.clientId,
      client_secret: opcoes.clientSecret,
    },
    opcoes.fetchFn ?? fetch,
  );
  return {
    ...renovados,
    refreshToken: renovados.refreshToken || opcoes.refreshToken,
  };
}

async function pedirTokens(
  corpo: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<TokensGoogle> {
  let resposta: Response;
  try {
    resposta = await fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(corpo),
    });
  } catch {
    throw new FalhaDoCalendario();
  }
  if (!resposta.ok) throw new FalhaDoCalendario();
  const json = (await resposta.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw new FalhaDoCalendario();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? "",
    expiraEmMs: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

export function criarObterAccessToken(opcoes: {
  tokens: TokensGoogle;
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
  aoRenovar?: (tokens: TokensGoogle) => void;
}): () => Promise<string> {
  let atual = opcoes.tokens;
  return async () => {
    if (atual.accessToken && atual.expiraEmMs > Date.now() + 30_000) {
      return atual.accessToken;
    }
    atual = await renovarTokens({
      refreshToken: atual.refreshToken,
      clientId: opcoes.clientId,
      clientSecret: opcoes.clientSecret,
      fetchFn: opcoes.fetchFn,
    });
    opcoes.aoRenovar?.(atual);
    return atual.accessToken;
  };
}

export const cookiesOAuth = {
  sessao: COOKIE_SESSAO,
  state: COOKIE_STATE,
  opcoesSessao: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  },
  opcoesState: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
    secure: process.env.NODE_ENV === "production",
  },
};

export function segredoDaSessao(env: EnvOAuth = process.env as EnvOAuth): string {
  return segredo(env);
}

export function redirectUriPadrao(origem: string): string {
  return `${origem.replace(/\/$/, "")}/api/auth/google/callback`;
}
