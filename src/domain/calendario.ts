import type { Compromisso, NovoCompromisso } from "./compromisso";

/** Intervalo de listagem em instantes ISO. */
export type IntervaloCalendario = {
  inicio: string;
  fim: string;
};

export type ListagemDetalhada = {
  compromissos: Compromisso[];
  /** Dia civil do último evento da agenda que bateu o teto de 500. */
  truncadoAte?: string;
};

/**
 * Porta Calendário: lê e grava Compromissos.
 * Na Consulta só se usa listar; criar/alterar/cancelar existem para os tickets seguintes.
 */
export interface Calendario {
  listar(intervalo: IntervaloCalendario): Promise<Compromisso[]>;
  /**
   * Mesma listagem, com aviso se alguma agenda atingiu o teto de uma página.
   * Opcional: quem não implementa cai em `listar`.
   */
  listarDetalhado?(intervalo: IntervaloCalendario): Promise<ListagemDetalhada>;
  criar(compromisso: NovoCompromisso): Promise<Compromisso>;
  alterar(id: string, mudancas: Partial<NovoCompromisso>): Promise<Compromisso>;
  cancelar(id: string): Promise<void>;
}

export async function listarDetalhado(
  calendario: Calendario,
  intervalo: IntervaloCalendario,
): Promise<ListagemDetalhada> {
  if (calendario.listarDetalhado) {
    return calendario.listarDetalhado(intervalo);
  }
  return { compromissos: await calendario.listar(intervalo) };
}
