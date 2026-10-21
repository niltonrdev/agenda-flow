import type { AudioDaConversa, Transcritor } from "@/domain/transcritor";

/**
 * Adaptador padrão: o ditado nativo do iPhone já deixou o texto no campo.
 * Não chama serviço externo e não exige chave.
 */
export function criarTranscritorDitadoNativo(): Transcritor {
  return {
    async transcrever(audio: AudioDaConversa): Promise<string> {
      if (audio.origem !== "ditado_nativo") {
        throw new Error(
          "O adaptador de ditado nativo só aceita texto já ditado no campo.",
        );
      }
      return audio.textoDoCampo.trim();
    },
  };
}
