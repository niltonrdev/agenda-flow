/** Falha da porta Calendário (Google indisponível, OAuth, HTTP). */
export const RESPOSTA_NAO_GRAVADO =
  "O Calendário não respondeu. Não foi gravado.";

export class FalhaDoCalendario extends Error {
  constructor(mensagem: string = RESPOSTA_NAO_GRAVADO) {
    super(mensagem);
    this.name = "FalhaDoCalendario";
  }
}
