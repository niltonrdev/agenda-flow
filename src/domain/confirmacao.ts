import type { DestinoAlteracao } from "./interpretador";

/** Proposta ainda não gravada. A rota guarda uma cópia cifrada no cookie. */
export type ConfirmacaoPontual = {
  acao: "marcar_pontual";
  titulo: string;
  /** Instantâneo ISO em America/Sao_Paulo. */
  inicio: string;
  fim: string;
  /** Depois do não: o próximo turno corrige esta proposta, não começa outra. */
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoPeriodo = {
  acao: "marcar_periodo";
  titulo: string;
  /** Dia civil YYYY-MM-DD em America/Sao_Paulo, extremos inclusive. */
  primeiroDia: string;
  ultimoDia: string;
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoAlterarPontual = {
  acao: "alterar_pontual";
  id: string;
  titulo: string;
  inicioAtual: string;
  fimAtual: string;
  inicio: string;
  fim: string;
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoAlterarPeriodo = {
  acao: "alterar_periodo";
  id: string;
  titulo: string;
  primeiroDiaAtual: string;
  ultimoDiaAtual: string;
  primeiroDia: string;
  ultimoDia: string;
  aguardandoCorrecao?: boolean;
};

export type CandidatoAlteracao = {
  id: string;
  rotulo: string;
};

export type ConfirmacaoEscolherAlteracao = {
  acao: "escolher_alteracao";
  candidatos: CandidatoAlteracao[];
  /** Ausente quando o Dono ainda não disse para quando alterar. */
  destino?: DestinoAlteracao;
  em?: string;
};

export type ConfirmacaoCancelarPontual = {
  acao: "cancelar_pontual";
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoCancelarPeriodo = {
  acao: "cancelar_periodo";
  id: string;
  titulo: string;
  primeiroDia: string;
  ultimoDia: string;
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoEscolherCancelamento = {
  acao: "escolher_cancelamento";
  candidatos: CandidatoAlteracao[];
  /** Instantâneo ISO; o contexto de escolha expira depois de TTL_CONTEXTO_MS. */
  em?: string;
};

/** Compromissos acabados de listar numa Consulta; "Cancelar"/"Alterar" curto usa esta lista. */
export type ConfirmacaoContextoListagem = {
  acao: "contexto_listagem";
  candidatos: CandidatoAlteracao[];
  em: string;
};

/** 15 min: mesmo prazo do cookie da proposta. */
export const TTL_CONTEXTO_MS = 15 * 60 * 1000;

/** Marcação iniciada sem horário (e às vezes sem dia): a Conversa completa no próximo turno. */
export type ConfirmacaoCompletarMarcacao = {
  acao: "completar_marcacao";
  titulo: string;
  /** Dia civil YYYY-MM-DD quando já conhecido. */
  dia?: string;
};

/** Alteração sem destino: a Conversa pede para quando mudar. */
export type ConfirmacaoCompletarAlteracao = {
  acao: "completar_alteracao";
  id: string;
  titulo: string;
};

/** Viagem sem intervalo: a Conversa pergunta se é 1 dia ou mais. */
export type ConfirmacaoCompletarDuracaoPeriodo = {
  acao: "completar_duracao_periodo";
  titulo: string;
  dia?: string;
};

/** Viagem de mais dias: a Conversa pede o intervalo (fala ou seletor). */
export type ConfirmacaoCompletarDiasPeriodo = {
  acao: "completar_dias_periodo";
  titulo: string;
  dia?: string;
};

/**
 * Continuação de "mostrar mais": filtro, offset e a página visível
 * (id+rótulo, sem descrição) para um Cancelar/Alterar curto.
 */
export type ConfirmacaoListagemPaginada = {
  acao: "listagem_paginada";
  filtro: "viagens" | "reunioes" | "busca";
  termo?: string;
  futuro: boolean;
  primeiroDia?: string;
  ultimoDia?: string;
  rotuloPeriodo?: string;
  offset: number;
  truncadoAte?: string;
  /** Página visível: "Cancelar"/"Alterar" curto usa estes ids+rótulos, sem descrição. */
  candidatos?: CandidatoAlteracao[];
  em?: string;
};

export type ConfirmacaoPendente =
  | ConfirmacaoPontual
  | ConfirmacaoPeriodo
  | ConfirmacaoAlterarPontual
  | ConfirmacaoAlterarPeriodo
  | ConfirmacaoEscolherAlteracao
  | ConfirmacaoCancelarPontual
  | ConfirmacaoCancelarPeriodo
  | ConfirmacaoEscolherCancelamento
  | ConfirmacaoCompletarMarcacao
  | ConfirmacaoCompletarAlteracao
  | ConfirmacaoCompletarDuracaoPeriodo
  | ConfirmacaoCompletarDiasPeriodo
  | ConfirmacaoContextoListagem
  | ConfirmacaoListagemPaginada;

export type ConfirmacaoMarcacao = ConfirmacaoPontual | ConfirmacaoPeriodo;

function tituloValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function destinoValido(valor: unknown): valor is DestinoAlteracao {
  if (!valor || typeof valor !== "object") return false;
  const destino = valor as Partial<DestinoAlteracao> & { tipo?: string };
  if (destino.tipo === "dia") return typeof destino.dia === "number";
  if (destino.tipo === "hora") {
    return typeof destino.hora === "number" && typeof destino.minuto === "number";
  }
  if (destino.tipo === "dia_e_hora") {
    return (
      typeof destino.dia === "number" &&
      typeof destino.hora === "number" &&
      typeof destino.minuto === "number"
    );
  }
  if (destino.tipo === "periodo") {
    return (
      typeof destino.primeiroDia === "string" &&
      typeof destino.ultimoDia === "string"
    );
  }
  if (destino.tipo === "primeiro_dia") {
    return typeof destino.primeiroDia === "string";
  }
  if (destino.tipo === "ultimo_dia") {
    return typeof destino.ultimoDia === "string";
  }
  return false;
}

export function ehConfirmacaoMarcacao(
  valor: ConfirmacaoPendente,
): valor is ConfirmacaoMarcacao {
  return valor.acao === "marcar_pontual" || valor.acao === "marcar_periodo";
}

/** A resposta espera sim ou não, não um complemento nem uma escolha na lista. */
export function pedeSimOuNao(proposta: ConfirmacaoPendente | null): boolean {
  if (!proposta) return false;
  if ("aguardandoCorrecao" in proposta && proposta.aguardandoCorrecao) {
    return false;
  }
  return (
    proposta.acao === "marcar_pontual" ||
    proposta.acao === "marcar_periodo" ||
    proposta.acao === "alterar_pontual" ||
    proposta.acao === "alterar_periodo" ||
    proposta.acao === "cancelar_pontual" ||
    proposta.acao === "cancelar_periodo"
  );
}

export function ehConfirmacaoPendente(valor: unknown): valor is ConfirmacaoPendente {
  if (!valor || typeof valor !== "object") return false;
  const proposta = valor as Partial<ConfirmacaoPendente> & { acao?: string };
  if (proposta.acao === "marcar_pontual") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.inicio === "string" &&
      typeof proposta.fim === "string"
    );
  }
  if (proposta.acao === "marcar_periodo") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.primeiroDia === "string" &&
      typeof proposta.ultimoDia === "string"
    );
  }
  if (proposta.acao === "alterar_pontual") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.id === "string" &&
      typeof proposta.inicioAtual === "string" &&
      typeof proposta.fimAtual === "string" &&
      typeof proposta.inicio === "string" &&
      typeof proposta.fim === "string"
    );
  }
  if (proposta.acao === "alterar_periodo") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.id === "string" &&
      typeof proposta.primeiroDiaAtual === "string" &&
      typeof proposta.ultimoDiaAtual === "string" &&
      typeof proposta.primeiroDia === "string" &&
      typeof proposta.ultimoDia === "string"
    );
  }
  if (proposta.acao === "escolher_alteracao") {
    return (
      Array.isArray(proposta.candidatos) &&
      proposta.candidatos.every(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.rotulo === "string",
      ) &&
      (proposta.destino === undefined || destinoValido(proposta.destino)) &&
      (proposta.em === undefined || typeof proposta.em === "string")
    );
  }
  if (proposta.acao === "cancelar_pontual") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.id === "string" &&
      typeof proposta.inicio === "string" &&
      typeof proposta.fim === "string"
    );
  }
  if (proposta.acao === "cancelar_periodo") {
    return (
      tituloValido(proposta.titulo) &&
      typeof proposta.id === "string" &&
      typeof proposta.primeiroDia === "string" &&
      typeof proposta.ultimoDia === "string"
    );
  }
  if (proposta.acao === "escolher_cancelamento") {
    return (
      Array.isArray(proposta.candidatos) &&
      proposta.candidatos.every(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.rotulo === "string",
      ) &&
      (proposta.em === undefined || typeof proposta.em === "string")
    );
  }
  if (proposta.acao === "contexto_listagem") {
    return (
      Array.isArray(proposta.candidatos) &&
      proposta.candidatos.every(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.rotulo === "string",
      ) &&
      typeof proposta.em === "string"
    );
  }
  if (proposta.acao === "completar_marcacao") {
    return (
      tituloValido(proposta.titulo) &&
      (proposta.dia === undefined || typeof proposta.dia === "string")
    );
  }
  if (proposta.acao === "completar_alteracao") {
    return tituloValido(proposta.titulo) && typeof proposta.id === "string";
  }
  if (
    proposta.acao === "completar_duracao_periodo" ||
    proposta.acao === "completar_dias_periodo"
  ) {
    return (
      tituloValido(proposta.titulo) &&
      (proposta.dia === undefined || typeof proposta.dia === "string")
    );
  }
  if (proposta.acao === "listagem_paginada") {
    const filtroOk =
      proposta.filtro === "viagens" ||
      proposta.filtro === "reunioes" ||
      proposta.filtro === "busca";
    const termoOk =
      proposta.filtro !== "busca" ||
      (typeof proposta.termo === "string" && proposta.termo.length >= 2);
    return (
      filtroOk &&
      termoOk &&
      typeof proposta.futuro === "boolean" &&
      typeof proposta.offset === "number" &&
      proposta.offset >= 0 &&
      (proposta.primeiroDia === undefined ||
        typeof proposta.primeiroDia === "string") &&
      (proposta.ultimoDia === undefined ||
        typeof proposta.ultimoDia === "string") &&
      (proposta.rotuloPeriodo === undefined ||
        typeof proposta.rotuloPeriodo === "string") &&
      (proposta.truncadoAte === undefined ||
        typeof proposta.truncadoAte === "string") &&
      (proposta.termo === undefined || typeof proposta.termo === "string") &&
      (proposta.em === undefined || typeof proposta.em === "string") &&
      (proposta.candidatos === undefined ||
        (Array.isArray(proposta.candidatos) &&
          proposta.candidatos.every(
            (c) =>
              c &&
              typeof c.id === "string" &&
              typeof c.rotulo === "string",
          )))
    );
  }
  return false;
}

export function ehListagemPaginada(
  valor: ConfirmacaoPendente,
): valor is ConfirmacaoListagemPaginada {
  return valor.acao === "listagem_paginada";
}

export function ehContextoListagem(
  valor: ConfirmacaoPendente,
): valor is ConfirmacaoContextoListagem {
  return valor.acao === "contexto_listagem";
}

/**
 * Confirmação (Sim/Não), completar ou desambiguar: a listagem não interrompe.
 * Contexto de consulta e paginação de "mostrar mais" não bloqueiam um
 * pedido novo de viagens/reuniões/busca.
 */
export function ehConfirmacaoQueBloqueiaListagem(
  pendente: ConfirmacaoPendente,
): boolean {
  return (
    pendente.acao !== "listagem_paginada" &&
    pendente.acao !== "contexto_listagem"
  );
}

export function candidatosDoContexto(
  pendente: ConfirmacaoPendente,
): CandidatoAlteracao[] | null {
  if (pendente.acao === "contexto_listagem") {
    return pendente.candidatos;
  }
  if (
    pendente.acao === "listagem_paginada" &&
    Array.isArray(pendente.candidatos) &&
    pendente.candidatos.length > 0
  ) {
    return pendente.candidatos;
  }
  return null;
}
