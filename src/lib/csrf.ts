const TIPOS_JSON = new Set(["application/json", "application/json;charset=utf-8"]);

export function contentTypeEhJson(request: Request): boolean {
  const bruto = request.headers.get("content-type");
  if (!bruto) return false;
  const tipo = bruto.split(";")[0]?.trim().toLowerCase() ?? "";
  const charset = bruto.toLowerCase();
  if (!TIPOS_JSON.has(tipo.replace(/\s+/g, ""))) {
    if (tipo !== "application/json") return false;
  }
  if (charset.includes("charset=") && !charset.includes("charset=utf-8")) {
    return false;
  }
  return tipo === "application/json";
}

export function origemDaApiPermitida(request: Request): boolean {
  const origin = request.headers.get("origin");
  const esperado = new URL(request.url).origin;
  if (origin) {
    return origin === esperado;
  }

  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") {
    return false;
  }
  // Sem Origin: só aceita same-origin explícito ou cliente não-navegador.
  return site === "same-origin" || site === "none" || site == null;
}

export function pedidoDeEscritaSeguro(request: Request): boolean {
  if (!contentTypeEhJson(request)) return false;
  if (!origemDaApiPermitida(request)) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  return true;
}
