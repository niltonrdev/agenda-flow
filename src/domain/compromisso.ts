/** Compromisso pontual: início e fim com hora. */
export type Pontual = {
  id: string;
  titulo: string;
  tipo: "pontual";
  /** Instantâneo ISO (com offset); interpretado em America/Sao_Paulo na Conversa. */
  inicio: string;
  fim: string;
  /**
   * Texto do evento só em memória, para casar tipo/termo.
   * Nunca exibir, gravar em cookie/banco, enviar a terceiro ou registrar em log.
   */
  descricao?: string;
};

/** Compromisso de dias inteiros, primeiro e último inclusive. */
export type Periodo = {
  id: string;
  titulo: string;
  tipo: "periodo";
  /** Dia civil YYYY-MM-DD em America/Sao_Paulo. */
  primeiroDia: string;
  ultimoDia: string;
  /**
   * Texto do evento só em memória, para casar tipo/termo.
   * Nunca exibir, gravar em cookie/banco, enviar a terceiro ou registrar em log.
   */
  descricao?: string;
};

export type Compromisso = Pontual | Periodo;

export type NovoCompromisso =
  | Omit<Pontual, "id">
  | Omit<Periodo, "id">;
