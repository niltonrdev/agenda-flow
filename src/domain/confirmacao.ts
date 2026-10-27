import type { DestinoAlteracao } from "./interpretador";

/** Proposta ainda não gravada. Viaja no turno; o servidor não a guarda. */
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
};

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
  | ConfirmacaoCompletarAlteracao;

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
      (proposta.destino === undefined || destinoValido(proposta.destino))
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
      )
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
  return false;
}
