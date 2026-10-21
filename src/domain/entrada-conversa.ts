import type { Calendario } from "./calendario";
import {
  ehConfirmacaoPendente,
  type ConfirmacaoPendente,
} from "./confirmacao";
import { compromissosEmConflito } from "./conflito";
import {
  formatarConfirmacao,
  formatarConsultaDia,
  formatarConsultaIntervalo,
  formatarPeriodoMarcado,
  formatarPontualMarcado,
  RESPOSTA_NAO_ENTENDI,
} from "./formatar-resposta";
import { fimDoDia, inicioDoDia } from "./fuso";
import { interpretarMensagem } from "./interpretador";
import { DateTime } from "luxon";

export type EntradaConversa = {
  mensagem: string;
  /** Relógio congelado nos testes; nunca ler Date.now() no núcleo. */
  agora: DateTime;
  /**
   * Proposta do turno anterior. O chamador devolve; o servidor não guarda.
   */
  confirmacaoPendente?: ConfirmacaoPendente | null;
};

export type SaidaConversa = {
  texto: string;
  confirmacaoPendente: ConfirmacaoPendente | null;
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
  const pendente = ehConfirmacaoPendente(entrada.confirmacaoPendente)
    ? entrada.confirmacaoPendente
    : null;

  if (intencao.tipo === "confirmar") {
    if (!pendente) {
      return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
    }
    if (pendente.acao === "marcar_periodo") {
      await calendario.criar({
        tipo: "periodo",
        titulo: pendente.titulo,
        primeiroDia: pendente.primeiroDia,
        ultimoDia: pendente.ultimoDia,
      });
      return {
        texto: formatarPeriodoMarcado(pendente),
        confirmacaoPendente: null,
      };
    }
    await calendario.criar({
      tipo: "pontual",
      titulo: pendente.titulo,
      inicio: pendente.inicio,
      fim: pendente.fim,
    });
    return {
      texto: formatarPontualMarcado(pendente),
      confirmacaoPendente: null,
    };
  }

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

  if (intencao.tipo === "marcar_pontual" || intencao.tipo === "marcar_periodo") {
    const proposta: ConfirmacaoPendente =
      intencao.tipo === "marcar_pontual"
        ? {
            acao: "marcar_pontual",
            titulo: intencao.titulo,
            inicio: intencao.inicio,
            fim: intencao.fim,
          }
        : {
            acao: "marcar_periodo",
            titulo: intencao.titulo,
            primeiroDia: intencao.primeiroDia,
            ultimoDia: intencao.ultimoDia,
          };
    const janela =
      proposta.acao === "marcar_pontual"
        ? { inicio: proposta.inicio, fim: proposta.fim }
        : {
            inicio: inicioDoDia(proposta.primeiroDia).toISO()!,
            fim: fimDoDia(proposta.ultimoDia).toISO()!,
          };
    const existentes = await calendario.listar(janela);
    const conflitos = compromissosEmConflito(
      proposta.acao === "marcar_pontual"
        ? { tipo: "pontual", inicio: proposta.inicio, fim: proposta.fim }
        : {
            tipo: "periodo",
            primeiroDia: proposta.primeiroDia,
            ultimoDia: proposta.ultimoDia,
          },
      existentes,
    );
    return {
      texto: formatarConfirmacao(proposta, conflitos),
      confirmacaoPendente: proposta,
    };
  }

  return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
}
