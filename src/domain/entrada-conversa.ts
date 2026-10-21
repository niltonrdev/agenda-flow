import type { Calendario } from "./calendario";
import type { ConfirmacaoPendente } from "./confirmacao";
import {
  formatarConfirmacao,
  formatarConsultaDia,
  formatarConsultaIntervalo,
  formatarGravado,
  RESPOSTA_NAO_ENTENDI,
} from "./formatar-resposta";
import { fimDoDia, inicioDoDia } from "./fuso";
import { interpretarMensagem, mensagemEhSim } from "./interpretador";
import { DateTime } from "luxon";

export type EntradaConversa = {
  mensagem: string;
  /** Relógio congelado nos testes; nunca ler Date.now() no núcleo. */
  agora: DateTime;
  /**
   * Confirmação ainda não gravada, devolvida no turno anterior.
   * Ausente ou nula: não há proposta.
   */
  confirmacaoPendente?: ConfirmacaoPendente | null;
};

export type SaidaConversa = {
  texto: string;
  confirmacaoPendente: ConfirmacaoPendente | null;
};

function propostaValida(
  proposta: ConfirmacaoPendente | null | undefined,
): proposta is ConfirmacaoPendente {
  if (!proposta || (proposta.tipo !== "periodo" && proposta.tipo !== "pontual")) {
    return false;
  }
  return typeof proposta.titulo === "string" && proposta.titulo.trim() !== "";
}

/**
 * Única entrada de conversa: Mensagem + agora → resposta em PT-BR.
 * A UI não decide domínio; só mostra o texto e devolve a Confirmação pendente.
 */
export async function processarTurno(
  entrada: EntradaConversa,
  calendario: Calendario,
): Promise<SaidaConversa> {
  if (mensagemEhSim(entrada.mensagem) && propostaValida(entrada.confirmacaoPendente)) {
    const proposta = entrada.confirmacaoPendente;
    if (proposta.tipo === "periodo") {
      await calendario.criar({
        tipo: "periodo",
        titulo: proposta.titulo,
        primeiroDia: proposta.primeiroDia,
        ultimoDia: proposta.ultimoDia,
      });
    } else {
      await calendario.criar({
        tipo: "pontual",
        titulo: proposta.titulo,
        inicio: proposta.inicio,
        fim: proposta.fim,
      });
    }
    return { texto: formatarGravado(proposta), confirmacaoPendente: null };
  }

  const intencao = interpretarMensagem(entrada.mensagem, entrada.agora);

  if (intencao.tipo === "desconhecida") {
    return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
  }

  if (intencao.tipo === "consulta_dia") {
    const compromissos = await calendario.listar({
      inicio: inicioDoDia(intencao.dia).toISO()!,
      fim: fimDoDia(intencao.dia).toISO()!,
    });
    return {
      texto: formatarConsultaDia(intencao.dia, compromissos),
      confirmacaoPendente: null,
    };
  }

  if (intencao.tipo === "consulta_intervalo") {
    const compromissos = await calendario.listar({
      inicio: inicioDoDia(intencao.primeiroDia).toISO()!,
      fim: fimDoDia(intencao.ultimoDia).toISO()!,
    });
    return {
      texto: formatarConsultaIntervalo(
        intencao.primeiroDia,
        intencao.ultimoDia,
        compromissos,
      ),
      confirmacaoPendente: null,
    };
  }

  if (intencao.tipo === "marcar_periodo") {
    const proposta: ConfirmacaoPendente = {
      tipo: "periodo",
      titulo: intencao.titulo,
      primeiroDia: intencao.primeiroDia,
      ultimoDia: intencao.ultimoDia,
    };
    return { texto: formatarConfirmacao(proposta), confirmacaoPendente: proposta };
  }

  const proposta: ConfirmacaoPendente = {
    tipo: "pontual",
    titulo: intencao.titulo,
    inicio: intencao.inicio,
    fim: intencao.fim,
  };
  return { texto: formatarConfirmacao(proposta), confirmacaoPendente: proposta };
}
