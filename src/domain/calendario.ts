import type { Compromisso, NovoCompromisso } from "./compromisso";

/** Intervalo de listagem em instantes ISO. */
export type IntervaloCalendario = {
  inicio: string;
  fim: string;
};

/**
 * Porta Calendário: lê e grava Compromissos.
 * Na Consulta só se usa listar; criar/alterar/cancelar existem para os tickets seguintes.
 */
export interface Calendario {
  listar(intervalo: IntervaloCalendario): Promise<Compromisso[]>;
  criar(compromisso: NovoCompromisso): Promise<Compromisso>;
  alterar(id: string, mudancas: Partial<NovoCompromisso>): Promise<Compromisso>;
  cancelar(id: string): Promise<void>;
}
