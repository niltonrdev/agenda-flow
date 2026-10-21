import type { Compromisso } from "./compromisso";
import type {
  ConfirmacaoAlterarPeriodo,
  ConfirmacaoAlterarPontual,
  ConfirmacaoPeriodo,
  ConfirmacaoPontual,
} from "./confirmacao";
import {
  FUSO_DONO,
  diaCivil,
  formatarDiaPorExtenso,
  formatarHora,
  inicioDoDia,
  NOMES_MESES_PT,
} from "./fuso";
import { DateTime } from "luxon";

export const RESPOSTA_NAO_ENTENDI =
  "Não entendi o pedido. Pode reformular?";

export const RESPOSTA_O_QUE_MUDAR = "O que mudar?";

function formatarCompromisso(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo} (dia inteiro)`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia)} a ${formatarDiaPorExtenso(compromisso.ultimoDia)}`;
}

function detalhePontual(titulo: string, inicio: string, fim: string): string {
  const dia = diaCivil(DateTime.fromISO(inicio, { setZone: true }));
  return `${titulo}, ${formatarDiaPorExtenso(dia)}, das ${formatarHora(inicio)} às ${formatarHora(fim)}`;
}

export function formatarConfirmacaoPontual(proposta: ConfirmacaoPontual): string {
  return `Confirmação: ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}. Diga sim para marcar.`;
}

export function formatarPontualMarcado(proposta: ConfirmacaoPontual): string {
  return `Marquei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}.`;
}

function detalhePeriodo(proposta: ConfirmacaoPeriodo): string {
  return `${proposta.titulo}, de ${formatarDiaPorExtenso(proposta.primeiroDia)} a ${formatarDiaPorExtenso(proposta.ultimoDia)}, dia inteiro`;
}

export function formatarConfirmacaoPeriodo(proposta: ConfirmacaoPeriodo): string {
  return `Confirmação: ${detalhePeriodo(proposta)}. Diga sim para marcar.`;
}

export function formatarPeriodoMarcado(proposta: ConfirmacaoPeriodo): string {
  return `Marquei ${detalhePeriodo(proposta)}.`;
}

function avisoConflitos(conflitos: Compromisso[]): string {
  if (conflitos.length === 0) return "";
  const detalhes = conflitos
    .map((c) => formatarCompromissoNoIntervalo(c))
    .join("; ");
  return ` Alerta de conflito: ${detalhes}.`;
}

export function formatarConfirmacaoAlterarPontual(
  proposta: ConfirmacaoAlterarPontual,
  conflitos: Compromisso[] = [],
): string {
  return `Confirmação: sai ${detalhePontual(proposta.titulo, proposta.inicioAtual, proposta.fimAtual)}; entra ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}.${avisoConflitos(conflitos)} Diga sim para alterar.`;
}

export function formatarConfirmacaoAlterarPeriodo(
  proposta: ConfirmacaoAlterarPeriodo,
  conflitos: Compromisso[] = [],
): string {
  const sai: ConfirmacaoPeriodo = {
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDiaAtual,
    ultimoDia: proposta.ultimoDiaAtual,
  };
  const entra: ConfirmacaoPeriodo = {
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  };
  return `Confirmação: sai ${detalhePeriodo(sai)}; entra ${detalhePeriodo(entra)}.${avisoConflitos(conflitos)} Diga sim para alterar.`;
}

export function formatarPontualAlterado(proposta: ConfirmacaoAlterarPontual): string {
  return `Alterei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}.`;
}

export function formatarPeriodoAlterado(proposta: ConfirmacaoAlterarPeriodo): string {
  return `Alterei ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  })}.`;
}

export function formatarNaoEncontrado(termo: string): string {
  return `Não encontrei um Compromisso chamado “${termo}”.`;
}

export function formatarListaCandidatos(rotulos: string[]): string {
  const linhas = rotulos.map((r) => `• ${r}`);
  return `Encontrei mais de um Compromisso. Qual você quer alterar?\n${linhas.join("\n")}`;
}

export function rotuloCandidato(compromisso: Compromisso): string {
  return formatarCompromissoNoIntervalo(compromisso);
}

export function formatarConsultaDia(
  dia: string,
  compromissos: Compromisso[],
): string {
  const rotulo = formatarDiaPorExtenso(dia);
  if (compromissos.length === 0) {
    return `${rotulo} está livre.`;
  }

  const linhas = compromissos.map((c) => `• ${formatarCompromisso(c)}`);
  return `Em ${rotulo}:\n${linhas.join("\n")}`;
}

function instanteDeOrdenacao(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return compromisso.inicio;
  }
  return inicioDoDia(compromisso.primeiroDia).toISO()!;
}

function formatarCompromissoNoIntervalo(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    const dia = diaCivil(
      DateTime.fromISO(compromisso.inicio, { setZone: true }),
    );
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}, ${formatarDiaPorExtenso(dia)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo}, ${formatarDiaPorExtenso(compromisso.primeiroDia)}`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia)} a ${formatarDiaPorExtenso(compromisso.ultimoDia)}`;
}

function rotuloIntervalo(primeiroDia: string, ultimoDia: string): string {
  if (primeiroDia === ultimoDia) {
    return formatarDiaPorExtenso(primeiroDia);
  }
  const a = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
  const b = DateTime.fromISO(ultimoDia, { zone: FUSO_DONO });
  if (a.month === b.month && a.year === b.year) {
    return `De ${a.day} a ${b.day} de ${NOMES_MESES_PT[a.month]}`;
  }
  return `De ${formatarDiaPorExtenso(primeiroDia)} a ${formatarDiaPorExtenso(ultimoDia)}`;
}

export function formatarConsultaIntervalo(
  primeiroDia: string,
  ultimoDia: string,
  compromissos: Compromisso[],
): string {
  if (primeiroDia === ultimoDia) {
    return formatarConsultaDia(primeiroDia, compromissos);
  }

  const rotulo = rotuloIntervalo(primeiroDia, ultimoDia);
  if (compromissos.length === 0) {
    return `${rotulo} está livre.`;
  }

  const linhas = [...compromissos]
    .sort((a, b) => instanteDeOrdenacao(a).localeCompare(instanteDeOrdenacao(b)))
    .map((c) => `• ${formatarCompromissoNoIntervalo(c)}`);
  return `${rotulo}:\n${linhas.join("\n")}`;
}
