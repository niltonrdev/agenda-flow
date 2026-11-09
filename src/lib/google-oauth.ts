import { falhaDeHttpGoogle, falhaDoCalendario } from "@/domain/falha-calendario";
import { cifrarValor, decifrarValor } from "@/lib/criptografia";
import { TIMEOUT_GOOGLE_MS } from "@/lib/limites";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_SESSAO = "agenda_google";
const COOKIE_STATE = "agenda_google_oauth_state";
const COOKIE_PROPOSTA = "agenda_proposta";

export const CAMINHO_CALLBACK_OAUTH = "/api/auth/google/callback";

export const ESCOPOS_OAUTH = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

const ESCOPO = ESCOPOS_OAUTH.join(" ");

export const MENSAGEM_OAUTH_HOST =
  "Este endereço não está autorizado para entrar com o Google. Abra a Agenda no endereço de produção, ou cadastre o redirect deste host no Google Cloud.";

/** 7 dias — expiração absoluta validada no servidor. */
export const MAX_AGE_SESSAO_S = 60 * 60 * 24 * 7;
/** 24 h sem uso invalida a sessão mesmo com cookie ainda presente. */
export const OCIOSIDADE_SESSAO_MS = 60 * 60 * 24 * 1000;
const MAX_AGE_STATE_S = 60 * 10;
export const MAX_AGE_PROPOSTA_S = 15 * 60;
const TAMANHO_MINIMO_SEGREDO = 32;

export type TokensGoogle = {
  accessToken: string;
  refreshToken: string;
  expiraEmMs: number;
  iat?: number;
  exp?: number;
  email?: string | null;
};

export type RedirectOAuth =
  | { ok: true; uri: string }
  | { ok: false; motivo: "host_divergente" | "uri_invalida" };

export type EnvOAuth = Record<string, string | undefined>;

export function credencialGoogleConfigurada(
  env: EnvOAuth = process.env as EnvOAuth,
): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function ambienteProducao(env: EnvOAuth): boolean {
  return (env.NODE_ENV ?? process.env.NODE_ENV) === "production";
}

function segredoBruto(env: EnvOAuth = process.env as EnvOAuth): string {
  return env.GOOGLE_TOKEN_SECRET?.trim() || "";
}

/**
 * Chave de cifra da sessão. Em produção exige GOOGLE_TOKEN_SECRET
 * próprio, com pelo menos 32 caracteres — sem fallback para o client secret.
 */
export function segredoDaSessao(env: EnvOAuth = process.env as EnvOAuth): string {
  const dedicado = segredoBruto(env);
  if (dedicado.length >= TAMANHO_MINIMO_SEGREDO) return dedicado;
  if (ambienteProducao(env)) {
    throw new Error(
      "GOOGLE_TOKEN_SECRET é obrigatório em produção (mínimo 32 caracteres).",
    );
  }
  return dedicado || env.GOOGLE_CLIENT_SECRET || "dev-token-secret-inseguro-nao-usar-em-prod";
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

export function serializarSessao(
  tokens: TokensGoogle,
  secret: string,
  agora = Date.now(),
): string {
  const iat = tokens.iat ?? agora;
  const exp = tokens.exp ?? agora + MAX_AGE_SESSAO_S * 1000;
  return cifrarValor(
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiraEmMs: tokens.expiraEmMs,
      iat,
      exp,
      ultimoUso: agora,
      email: tokens.email ?? null,
    }),
    secret,
  );
}

export function desserializarSessao(
  pacote: string | undefined,
  secret: string,
  agora = Date.now(),
): TokensGoogle | null {
  if (!pacote || !secret) return null;
  const valor = decifrarValor(pacote, secret);
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor) as Partial<TokensGoogle> & {
      ultimoUso?: unknown;
    };
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiraEmMs !== "number" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.ultimoUso !== "number"
    ) {
      return null;
    }
    if (parsed.exp <= agora) return null;
    if (agora - parsed.ultimoUso > OCIOSIDADE_SESSAO_MS) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiraEmMs: parsed.expiraEmMs,
      iat: parsed.iat,
      exp: parsed.exp,
      email: typeof parsed.email === "string" ? parsed.email : null,
    };
  } catch {
    return null;
  }
}

export function urlDeAutorizacao(opcoes: {
  clientId: string;
  redirectUri: string;
  state: string;
  /** Só força a tela de permissões quando ainda não temos refresh_token. */
  forcarConsentimento?: boolean;
}): string {
  const params = new URLSearchParams({
    client_id: opcoes.clientId,
    redirect_uri: opcoes.redirectUri,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    include_granted_scopes: "false",
    state: opcoes.state,
  });
  if (opcoes.forcarConsentimento) {
    params.set("prompt", "consent");
  }
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

export async function revogarTokenGoogle(opcoes: {
  token: string;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_GOOGLE_MS);
  try {
    await fetchFn("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: opcoes.token }),
      signal: controlador.signal,
    });
  } catch {
    // A sessão local some mesmo se o Google não responder.
  } finally {
    clearTimeout(timer);
  }
}

async function pedirTokens(
  corpo: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<TokensGoogle> {
  let resposta: Response;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_GOOGLE_MS);
  try {
    resposta = await fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(corpo),
      signal: controlador.signal,
    });
  } catch {
    throw falhaDoCalendario("temporaria");
  } finally {
    clearTimeout(timer);
  }
  if (!resposta.ok) {
    if (resposta.status === 400 || resposta.status === 401) {
      throw falhaDoCalendario("reconectar");
    }
    throw falhaDeHttpGoogle(resposta.status);
  }
  const json = (await resposta.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw falhaDoCalendario("reconectar");
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
    atual = {
      ...atual,
      iat: opcoes.tokens.iat,
      exp: opcoes.tokens.exp,
      email: opcoes.tokens.email,
    };
    opcoes.aoRenovar?.(atual);
    return atual.accessToken;
  };
}

export const cookiesOAuth = {
  sessao: COOKIE_SESSAO,
  state: COOKIE_STATE,
  proposta: COOKIE_PROPOSTA,
  maxAgeSessao: MAX_AGE_SESSAO_S,
  opcoesSessao: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SESSAO_S,
    secure: process.env.NODE_ENV === "production",
  },
  opcoesState: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_STATE_S,
    secure: process.env.NODE_ENV === "production",
  },
  opcoesProposta: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_PROPOSTA_S,
    secure: process.env.NODE_ENV === "production",
  },
};

/** Max-Age + Expires no momento do set (Safari não trata só Max-Age como persistente). */
export function opcoesCookieSessaoAgora(): typeof cookiesOAuth.opcoesSessao & {
  expires: Date;
} {
  return {
    ...cookiesOAuth.opcoesSessao,
    expires: new Date(Date.now() + MAX_AGE_SESSAO_S * 1000),
  };
}

export function opcoesCookieStateAgora(): typeof cookiesOAuth.opcoesState & {
  expires: Date;
} {
  return {
    ...cookiesOAuth.opcoesState,
    expires: new Date(Date.now() + MAX_AGE_STATE_S * 1000),
  };
}

export function opcoesCookiePropostaAgora(): typeof cookiesOAuth.opcoesProposta & {
  expires: Date;
} {
  return {
    ...cookiesOAuth.opcoesProposta,
    expires: new Date(Date.now() + MAX_AGE_PROPOSTA_S * 1000),
  };
}

export function opcoesCookieApagado(
  base:
    | typeof cookiesOAuth.opcoesSessao
    | typeof cookiesOAuth.opcoesProposta
    | typeof cookiesOAuth.opcoesState,
) {
  return {
    ...base,
    maxAge: 0,
    expires: new Date(0),
  };
}

export function redirectUriPadrao(origem: string): string {
  return `${origem.replace(/\/$/, "")}${CAMINHO_CALLBACK_OAUTH}`;
}

/**
 * Sem GOOGLE_REDIRECT_URI: callback same-origin (`<origem>/api/auth/google/callback`).
 * Com a variável: só vale se for deste host; outro host é recusado (não mistura cookie/callback).
 */
export function decidirRedirectOAuth(
  origemPedido: string,
  env: EnvOAuth = process.env as EnvOAuth,
): RedirectOAuth {
  const origem = origemPedido.replace(/\/$/, "");
  const configurado = env.GOOGLE_REDIRECT_URI?.trim();
  if (configurado) {
    let url: URL;
    try {
      url = new URL(configurado);
    } catch {
      return { ok: false, motivo: "uri_invalida" };
    }
    if (url.pathname !== CAMINHO_CALLBACK_OAUTH) {
      return { ok: false, motivo: "uri_invalida" };
    }
    if (url.origin !== origem) {
      return { ok: false, motivo: "host_divergente" };
    }
    return { ok: true, uri: configurado };
  }
  return { ok: true, uri: redirectUriPadrao(origem) };
}

/**
 * Resolve o redirect_uri do OAuth. Variável vazia → callback da origem.
 * Host divergente não é usado — evita misturar cookie/callback.
 */
export function resolverRedirectUri(
  origem: string,
  env: EnvOAuth = process.env as EnvOAuth,
): string {
  const decisao = decidirRedirectOAuth(origem, env);
  if (decisao.ok) return decisao.uri;
  return redirectUriPadrao(origem);
}

export function emailPublicavel(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim();
  if (!email || !email.includes("@") || /\s/.test(email)) return null;
  return email;
}

export async function obterIdentidadeGoogle(opcoes: {
  accessToken: string;
  fetchFn?: typeof fetch;
}): Promise<string | null> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_GOOGLE_MS);
  let resposta: Response;
  try {
    resposta = await fetchFn("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${opcoes.accessToken}` },
      signal: controlador.signal,
    });
  } catch {
    throw falhaDoCalendario("temporaria");
  } finally {
    clearTimeout(timer);
  }
  if (!resposta.ok) throw falhaDeHttpGoogle(resposta.status);
  const json = (await resposta.json()) as { email?: unknown };
  return emailPublicavel(json.email);
}
