/**
 * Porta Transcritor: o Áudio da Conversa vira texto antes do núcleo.
 * O núcleo só recebe Mensagem em texto; um adaptador de servidor
 * entra atrás desta mesma porta, sem tocar em processarTurno.
 */
export type AudioDaConversa =
  | { origem: "ditado_nativo"; textoDoCampo: string }
  | { origem: "servidor"; bytes: Uint8Array; mime?: string };

export interface Transcritor {
  transcrever(audio: AudioDaConversa): Promise<string>;
}

export async function mensagemAPartirDoCampo(
  transcritor: Transcritor,
  textoDoCampo: string,
): Promise<string> {
  return transcritor.transcrever({
    origem: "ditado_nativo",
    textoDoCampo,
  });
}
