/** Proposta ainda não gravada. Viaja no turno; o servidor não a guarda. */
export type ConfirmacaoPontual = {
  acao: "marcar_pontual";
  titulo: string;
  /** Instantâneo ISO em America/Sao_Paulo. */
  inicio: string;
  fim: string;
};

export type ConfirmacaoPeriodo = {
  acao: "marcar_periodo";
  titulo: string;
  /** Dia civil YYYY-MM-DD em America/Sao_Paulo, extremos inclusive. */
  primeiroDia: string;
  ultimoDia: string;
};

export type ConfirmacaoPendente = ConfirmacaoPontual | ConfirmacaoPeriodo;

export function ehConfirmacaoPendente(valor: unknown): valor is ConfirmacaoPendente {
  if (!valor || typeof valor !== "object") return false;
  const proposta = valor as Partial<ConfirmacaoPendente>;
  if (typeof proposta.titulo !== "string" || proposta.titulo.trim() === "") {
    return false;
  }
  if (proposta.acao === "marcar_pontual") {
    return typeof proposta.inicio === "string" && typeof proposta.fim === "string";
  }
  if (proposta.acao === "marcar_periodo") {
    return (
      typeof proposta.primeiroDia === "string" &&
      typeof proposta.ultimoDia === "string"
    );
  }
  return false;
}
