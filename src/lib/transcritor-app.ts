import { criarTranscritorDitadoNativo } from "@/adapters/transcritor-ditado-nativo";
import type { Transcritor } from "@/domain/transcritor";

/**
 * Adaptador padrão da v1: ditado nativo no campo.
 * Troca por um adaptador de servidor sem mudar o núcleo.
 */
export function obterTranscritor(): Transcritor {
  return criarTranscritorDitadoNativo();
}
