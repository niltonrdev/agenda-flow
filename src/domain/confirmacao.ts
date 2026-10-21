import type { DestinoAlteracao } from "./interpretador";

/** Proposta ainda não gravada. Viaja no turno; o servidor não a guarda. */
export type ConfirmacaoPontual = {
  acao: "marcar_pontual";
  titulo: string;
  /** Instantâneo ISO em America/Sao_Paulo. */
  inicio: string;
  fim: string;
  aguardandoCorrecao?: boolean;
};

export type ConfirmacaoPeriodo = {
  acao: "marcar_periodo";
  titulo: string;
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
  destino: DestinoAlteracao;
};

export type ConfirmacaoPendente =
  | ConfirmacaoPontual
  | ConfirmacaoPeriodo
  | ConfirmacaoAlterarPontual
  | ConfirmacaoAlterarPeriodo
  | ConfirmacaoEscolherAlteracao;

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
      destinoValido(proposta.destino)
    );
  }
  return false;
}
