import { criarCalendarioDeDemonstracao } from "@/adapters/calendario-em-memoria";
import type { Calendario } from "@/domain/calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";

/**
 * Sem credencial do Google: usa o adaptador em memória semeado.
 * Troca pelo adaptador Google quando houver OAuth (ticket 10).
 */
let calendarioSingleton: Calendario | null = null;

export function obterCalendario(
  agora: DateTime = DateTime.now().setZone(FUSO_DONO),
): Calendario {
  if (!calendarioSingleton) {
    calendarioSingleton = criarCalendarioDeDemonstracao(agora);
  }
  return calendarioSingleton;
}
