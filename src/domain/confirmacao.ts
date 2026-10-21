/** Proposta ainda não gravada. Viaja no turno; não fica em estado global. */
export type ConfirmacaoPendente =
  | {
      tipo: "periodo";
      titulo: string;
      primeiroDia: string;
      ultimoDia: string;
    }
  | {
      tipo: "pontual";
      titulo: string;
      inicio: string;
      fim: string;
    };
