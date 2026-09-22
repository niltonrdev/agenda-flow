/** Compromisso pontual: início e fim com hora. */
export type Pontual = {
  id: string;
  titulo: string;
  tipo: "pontual";
  /** Instantâneo ISO (com offset); interpretado em America/Sao_Paulo na Conversa. */
  inicio: string;
  fim: string;
};

/** Compromisso de dias inteiros, primeiro e último inclusive. */
export type Periodo = {
  id: string;
  titulo: string;
  tipo: "periodo";
  /** Dia civil YYYY-MM-DD em America/Sao_Paulo. */
  primeiroDia: string;
  ultimoDia: string;
};

export type Compromisso = Pontual | Periodo;

export type NovoCompromisso =
  | Omit<Pontual, "id">
  | Omit<Periodo, "id">;
