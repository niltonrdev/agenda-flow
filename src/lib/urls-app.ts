export const NOME_DO_APP = "Agenda Inteligente";

export const CAMINHO_INICIO = "/";
export const CAMINHO_CONVERSA = "/conversa";
export const CAMINHO_PRIVACIDADE = "/privacidade";
export const CAMINHO_TERMOS = "/termos";
export const CAMINHO_CALLBACK_OAUTH = "/api/auth/google/callback";

/** Depois do OAuth o Dono volta à Conversa, não à homepage pública. */
export const CAMINHO_APOS_OAUTH = CAMINHO_CONVERSA;

export function caminhoOAuthResultado(
  resultado: "ok" | "falha" | "negado" | "host",
): string {
  return `${CAMINHO_APOS_OAUTH}?google=${resultado}`;
}

export const DATA_VIGENCIA_LEGAL = "14 de novembro de 2026";

export const URL_REVOGAR_ACESSO_GOOGLE =
  "https://myaccount.google.com/permissions";

export const URL_POLITICA_DADOS_GOOGLE =
  "https://developers.google.com/terms/api-services-user-data-policy";

export const DECLARACAO_LIMITED_USE =
  "O uso e a transferência de informações recebidas das APIs do Google pelo Agenda Inteligente seguem a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado";

/**
 * Páginas que o Google precisa abrir sem login. A Conversa em /conversa
 * também abre sem sessão (mostra Google/demonstração), mas não é a homepage.
 */
export const CAMINHOS_PUBLICOS = [
  CAMINHO_INICIO,
  CAMINHO_PRIVACIDADE,
  CAMINHO_TERMOS,
] as const;

export type EnvUrls = Record<string, string | undefined>;

export type UrlsPublicas = {
  origem: string;
  inicio: string;
  conversa: string;
  privacidade: string;
  termos: string;
  oauthCallback: string;
  origemJavascript: string;
};

export function caminhoNormalizado(pathname: string): string {
  if (!pathname || pathname === "") return CAMINHO_INICIO;
  const semQuery = pathname.split("?")[0] ?? CAMINHO_INICIO;
  if (semQuery.length > 1 && semQuery.endsWith("/")) {
    return semQuery.slice(0, -1);
  }
  return semQuery;
}

export function caminhoEhPublico(pathname: string): boolean {
  const path = caminhoNormalizado(pathname);
  return (CAMINHOS_PUBLICOS as readonly string[]).includes(path);
}

/**
 * Nenhuma rota HTML exige sessão no middleware: a Conversa trata o
 * login na própria tela. Este predicado existe para o teste de regressão
 * da verificação OAuth (homepage, privacidade e termos sem login).
 */
export function caminhoExigeSessao(pathname: string): boolean {
  void pathname;
  return false;
}

export function origemDoAmbiente(env: EnvUrls = process.env as EnvUrls): string | null {
  const bruto =
    env.APP_ORIGIN?.trim() ||
    env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    env.NEXTAUTH_URL?.trim() ||
    "";
  if (!bruto) return null;
  try {
    const url = new URL(bruto);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function urlsPublicas(origem: string): UrlsPublicas {
  const base = origem.replace(/\/$/, "");
  return {
    origem: base,
    inicio: `${base}/`,
    conversa: `${base}${CAMINHO_CONVERSA}`,
    privacidade: `${base}${CAMINHO_PRIVACIDADE}`,
    termos: `${base}${CAMINHO_TERMOS}`,
    oauthCallback: `${base}${CAMINHO_CALLBACK_OAUTH}`,
    origemJavascript: base,
  };
}

export type PedidoCanonico = {
  host: string;
  pathname: string;
  search?: string;
  method?: string;
};

export type RedirectCanonico =
  | { ok: true; destino: string }
  | { ok: false; motivo: string };

/**
 * Redirect opt-in do host de produção *.vercel.app para APP_ORIGIN.
 * Só páginas públicas GET; nunca /api/* nem /conversa (cookie OAuth é
 * por host — redirecionar o callback ou a Conversa derrubaria a sessão).
 * Preview da Vercel não entra: VERCEL_ENV precisa ser production.
 */
export function decidirRedirectCanonico(
  pedido: PedidoCanonico,
  env: EnvUrls = process.env as EnvUrls,
): RedirectCanonico {
  if ((env.REDIRECT_VERCEL_PARA_CANONICO ?? "").trim() !== "1") {
    return { ok: false, motivo: "desligado" };
  }
  if ((env.VERCEL_ENV ?? "").trim() !== "production") {
    return { ok: false, motivo: "nao_producao" };
  }
  const canonico = origemDoAmbiente(env);
  if (!canonico) {
    return { ok: false, motivo: "sem_origem" };
  }
  let hostCanonico: string;
  try {
    hostCanonico = new URL(canonico).host;
  } catch {
    return { ok: false, motivo: "origem_invalida" };
  }
  const host = pedido.host.replace(/:\d+$/, "");
  if (host === hostCanonico) {
    return { ok: false, motivo: "ja_canonico" };
  }
  if (!host.endsWith(".vercel.app")) {
    return { ok: false, motivo: "host_nao_vercel" };
  }
  const metodo = (pedido.method ?? "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "HEAD") {
    return { ok: false, motivo: "metodo" };
  }
  const path = caminhoNormalizado(pedido.pathname);
  if (path.startsWith("/api/")) {
    return { ok: false, motivo: "api" };
  }
  if (path === CAMINHO_CONVERSA || path.startsWith(`${CAMINHO_CONVERSA}/`)) {
    return { ok: false, motivo: "conversa" };
  }
  if (!caminhoEhPublico(path)) {
    return { ok: false, motivo: "nao_publico" };
  }
  const search = pedido.search ?? "";
  const destino = `${canonico}${path === CAMINHO_INICIO ? "/" : path}${search}`;
  return { ok: true, destino };
}
