import type { Calendario } from "./calendario";
import { formatarConsultaDia, RESPOSTA_NAO_ENTENDI } from "./formatar-resposta";
import { fimDoDia, inicioDoDia } from "./fuso";
import { interpretarMensagem } from "./interpretador";
import { DateTime } from "luxon";

export type EntradaConversa = {
  mensagem: string;
  /** Relógio congelado nos testes; nunca ler Date.now() no núcleo. */
  agora: DateTime;
};

export type SaidaConversa = {
  texto: string;
};

/**
 * Única entrada de conversa: Mensagem + agora → resposta em PT-BR.
 * A UI não decide domínio; só mostra o texto.
 */
export async function processarTurno(
  entrada: EntradaConversa,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const intencao = interpretarMensagem(entrada.mensagem, entrada.agora);

  if (intencao.tipo === "desconhecida") {
    return { texto: RESPOSTA_NAO_ENTENDI };
  }

  if (intencao.tipo === "consulta_dia") {
    const compromissos = await calendario.listar({
      inicio: inicioDoDia(intencao.dia).toISO()!,
      fim: fimDoDia(intencao.dia).toISO()!,
    });
    return { texto: formatarConsultaDia(intencao.dia, compromissos) };
  }

  return { texto: RESPOSTA_NAO_ENTENDI };
}
