import { criarCalendarioDeDemonstracao } from "@/adapters/calendario-em-memoria";
import type { Calendario } from "@/domain/calendario";

/**
 * Sem credencial do Google: usa o adaptador em memória semeado.
 * Troca pelo adaptador Google quando houver OAuth (ticket 10).
 */
let calendarioSingleton: Calendario | null = null;

export function obterCalendario(): Calendario {
  if (!calendarioSingleton) {
    calendarioSingleton = criarCalendarioDeDemonstracao();
  }
  return calendarioSingleton;
}
