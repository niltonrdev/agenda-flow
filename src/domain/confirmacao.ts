/** Proposta ainda não gravada. Viaja no turno; o servidor não a guarda. */
export type ConfirmacaoPendente = {
  acao: "marcar_pontual";
  titulo: string;
  /** Instantâneo ISO em America/Sao_Paulo. */
  inicio: string;
  fim: string;
};

export function ehConfirmacaoPendente(valor: unknown): valor is ConfirmacaoPendente {
  if (!valor || typeof valor !== "object") return false;
  const proposta = valor as Partial<ConfirmacaoPendente>;
  return (
    proposta.acao === "marcar_pontual" &&
    typeof proposta.titulo === "string" &&
    proposta.titulo.trim() !== "" &&
    typeof proposta.inicio === "string" &&
    typeof proposta.fim === "string"
  );
}
