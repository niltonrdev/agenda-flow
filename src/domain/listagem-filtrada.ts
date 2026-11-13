import type { Calendario } from "./calendario";
import { listarDetalhado } from "./calendario";
import {
  ehListagemPaginada,
  type ConfirmacaoListagemPaginada,
  type ConfirmacaoPendente,
} from "./confirmacao";
import type { Compromisso } from "./compromisso";
import {
  BUSCA_INCLUI_PADRAO,
  casaComFiltroTipo,
  casaComTermoLivre,
  compromissoPublico,
  janelaDaListagem,
  type FiltroTipo,
} from "./filtro-compromisso";
import {
  cabecalhoListagemBusca,
  cabecalhoListagemTipo,
  formatarListagemFiltrada,
  mensagemVaziaBusca,
  mensagemVaziaTipo,
  RESPOSTA_NAO_ENTENDI,
  RESPOSTA_TERMO_BUSCA,
  RESPOSTA_TIPO_NAO_RECONHECIDO,
} from "./formatar-resposta";
import { ITENS_POR_LISTAGEM } from "@/lib/limites";
import type {
  Intencao,
  IntencaoBuscaLivre,
  IntencaoConsultaTipo,
} from "./interpretador";
import { DateTime } from "luxon";

export function ehIntencaoDeListagem(intencao: Intencao): boolean {
  return (
    intencao.tipo === "consulta_tipo" ||
    intencao.tipo === "busca_livre" ||
    intencao.tipo === "busca_termo_invalido" ||
    intencao.tipo === "mostrar_mais" ||
    intencao.tipo === "tipo_nao_reconhecido"
  );
}

type SaidaListagem = {
  texto: string;
  confirmacaoPendente: ConfirmacaoPendente | null;
};

function saidaTexto(
  texto: string,
  pendente: ConfirmacaoPendente | null,
): SaidaListagem {
  return {
    texto,
    confirmacaoPendente: pendente,
  };
}

function filtrar(
  compromissos: Compromisso[],
  consulta: Pick<
    ConfirmacaoListagemPaginada,
    "filtro" | "termo"
  >,
): Compromisso[] {
  if (consulta.filtro === "busca") {
    const termo = consulta.termo ?? "";
    return compromissos.filter((c) =>
      casaComTermoLivre(c, termo, BUSCA_INCLUI_PADRAO),
    );
  }
  return compromissos.filter((c) =>
    casaComFiltroTipo(c, consulta.filtro as FiltroTipo, BUSCA_INCLUI_PADRAO),
  );
}

function montarPendente(
  consulta: Omit<ConfirmacaoListagemPaginada, "acao" | "offset">,
  proximoOffset: number | null,
): ConfirmacaoListagemPaginada | null {
  if (proximoOffset == null) return null;
  return {
    acao: "listagem_paginada",
    ...consulta,
    offset: proximoOffset,
  };
}

async function executarListagem(
  calendario: Calendario,
  agora: DateTime,
  consulta: Omit<ConfirmacaoListagemPaginada, "acao">,
): Promise<SaidaListagem> {
  const janela = janelaDaListagem(agora, {
    futuro: consulta.futuro,
    primeiroDia: consulta.primeiroDia,
    ultimoDia: consulta.ultimoDia,
  });
  const { compromissos, truncadoAte } = await listarDetalhado(
    calendario,
    janela,
  );
  const teto = consulta.truncadoAte ?? truncadoAte;
  const filtrados = filtrar(compromissos, consulta).map(compromissoPublico);
  const cabecalho =
    consulta.filtro === "busca"
      ? cabecalhoListagemBusca(consulta.termo ?? "", consulta.rotuloPeriodo)
      : cabecalhoListagemTipo(consulta.filtro, consulta.rotuloPeriodo);
  const vazia =
    consulta.filtro === "busca"
      ? mensagemVaziaBusca(consulta.termo ?? "", consulta.rotuloPeriodo)
      : mensagemVaziaTipo(consulta.filtro, consulta.rotuloPeriodo);
  const formatada = formatarListagemFiltrada(filtrados, agora, {
    cabecalho,
    vazia,
    offset: consulta.offset,
    itensPorPagina: ITENS_POR_LISTAGEM,
    truncadoAte: teto,
  });
  return saidaTexto(
    formatada.texto,
    montarPendente(
      {
        filtro: consulta.filtro,
        termo: consulta.termo,
        futuro: consulta.futuro,
        primeiroDia: consulta.primeiroDia,
        ultimoDia: consulta.ultimoDia,
        rotuloPeriodo: consulta.rotuloPeriodo,
        truncadoAte: teto,
      },
      formatada.proximoOffset,
    ),
  );
}

function consultaDeIntencao(
  intencao: IntencaoConsultaTipo | IntencaoBuscaLivre,
): Omit<ConfirmacaoListagemPaginada, "acao" | "offset"> {
  if (intencao.tipo === "busca_livre") {
    return {
      filtro: "busca",
      termo: intencao.termo,
      futuro: intencao.futuro,
      primeiroDia: intencao.primeiroDia,
      ultimoDia: intencao.ultimoDia,
      rotuloPeriodo: intencao.rotuloPeriodo,
    };
  }
  return {
    filtro: intencao.filtro,
    futuro: intencao.futuro,
    primeiroDia: intencao.primeiroDia,
    ultimoDia: intencao.ultimoDia,
    rotuloPeriodo: intencao.rotuloPeriodo,
  };
}

/**
 * Listagem por tipo/busca. Confirmação pendente (exceto a própria paginação)
 * tem prioridade: devolve null para o fluxo atual continuar, ou uma saída
 * que preserva a proposta quando a intenção é só de listagem.
 */
export async function processarIntencaoListagem(
  intencao: Intencao,
  pendente: ConfirmacaoPendente | null,
  agora: DateTime,
  calendario: Calendario,
): Promise<SaidaListagem | null> {
  if (!ehIntencaoDeListagem(intencao)) return null;

  const confirmacaoEmAndamento =
    pendente != null && !ehListagemPaginada(pendente);
  if (confirmacaoEmAndamento) {
    return saidaTexto(RESPOSTA_NAO_ENTENDI, pendente);
  }

  if (intencao.tipo === "busca_termo_invalido") {
    return saidaTexto(RESPOSTA_TERMO_BUSCA, null);
  }
  if (intencao.tipo === "tipo_nao_reconhecido") {
    return saidaTexto(RESPOSTA_TIPO_NAO_RECONHECIDO, null);
  }
  if (intencao.tipo === "mostrar_mais") {
    if (!pendente || !ehListagemPaginada(pendente)) {
      return saidaTexto(RESPOSTA_TIPO_NAO_RECONHECIDO, null);
    }
    return executarListagem(calendario, agora, pendente);
  }
  if (intencao.tipo === "consulta_tipo" || intencao.tipo === "busca_livre") {
    return executarListagem(calendario, agora, {
      ...consultaDeIntencao(intencao),
      offset: 0,
    });
  }
  return null;
}
