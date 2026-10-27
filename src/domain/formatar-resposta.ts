import type { Compromisso } from "./compromisso";
import type {
  ConfirmacaoAlterarPeriodo,
  ConfirmacaoAlterarPontual,
  ConfirmacaoCancelarPeriodo,
  ConfirmacaoCancelarPontual,
  ConfirmacaoMarcacao,
  ConfirmacaoPeriodo,
  ConfirmacaoPontual,
} from "./confirmacao";
import {
  FUSO_DONO,
  agoraEmBrasilia,
  diaCivil,
  diaCivilJaPassou,
  formatarDiaPorExtenso,
  formatarHora,
  inicioDoDia,
  NOMES_MESES_PT,
} from "./fuso";
import { DateTime } from "luxon";

export const RESPOSTA_NAO_ENTENDI =
  "Não entendi o pedido. Pode reformular?";

export const RESPOSTA_O_QUE_MUDAR = "O que mudar?";

export const RESPOSTA_ALTERACAO_DOS_EXTREMOS =
  "Para soltar um dia de um Período, isso é Alteração dos extremos, não Cancelamento. Nada foi removido.";

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

function detalhePeriodo(proposta: ConfirmacaoPeriodo): string {
  return `${proposta.titulo}, de ${formatarDiaPorExtenso(proposta.primeiroDia)} a ${formatarDiaPorExtenso(proposta.ultimoDia)}, dia inteiro`;
}

function detalheProposta(proposta: ConfirmacaoMarcacao): string {
  if (proposta.acao === "marcar_pontual") {
    return detalhePontual(proposta.titulo, proposta.inicio, proposta.fim);
  }
  return detalhePeriodo(proposta);
}

export function formatarConfirmacao(
  proposta: ConfirmacaoMarcacao,
  conflitos: Compromisso[] = [],
): string {
  const base = `Confirmação: ${detalheProposta(proposta)}.`;
  if (conflitos.length === 0) {
    return `${base} Diga sim para marcar.`;
  }
  const avisos = conflitos
    .map((c) => formatarCompromissoNoIntervalo(c))
    .join("; ");
  return `${base} Alerta de conflito: ${avisos}. Diga sim para marcar mesmo assim.`;
}

export function formatarConfirmacaoPontual(proposta: ConfirmacaoPontual): string {
  return formatarConfirmacao(proposta);
}

export function formatarConfirmacaoPeriodo(proposta: ConfirmacaoPeriodo): string {
  return formatarConfirmacao(proposta);
}

export function formatarPontualMarcado(proposta: ConfirmacaoPontual): string {
  return `Marquei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}. Compromisso gravado.`;
}

export function formatarPeriodoMarcado(proposta: ConfirmacaoPeriodo): string {
  return `Marquei ${detalhePeriodo(proposta)}. Compromisso gravado.`;
}

export function formatarPedirHorarioMarcacao(
  titulo: string,
  dia: string,
): string {
  return `Para marcar ${titulo} em ${formatarDiaPorExtenso(dia)}, diga o horário — por exemplo “às 15h”.`;
}

export function formatarPedirDiaEHorarioMarcacao(titulo: string): string {
  return `Para marcar ${titulo}, diga o dia e o horário — por exemplo “20 de dezembro às 15h”.`;
}

export function formatarPedirDestinoAlteracao(titulo: string): string {
  return `Para alterar ${titulo}, diga o novo dia, horário ou intervalo — por exemplo “para o dia 30” ou “para os dias 29 a 31 de novembro”.`;
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

export function formatarConfirmacaoCancelarPontual(
  proposta: ConfirmacaoCancelarPontual,
): string {
  return `Confirmação: cancelar ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}. Diga sim para cancelar.`;
}

export function formatarConfirmacaoCancelarPeriodo(
  proposta: ConfirmacaoCancelarPeriodo,
): string {
  return `Confirmação: cancelar ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  })}. Diga sim para cancelar.`;
}

export function formatarPontualCancelado(
  proposta: ConfirmacaoCancelarPontual,
): string {
  return `Cancelei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim)}.`;
}

export function formatarPeriodoCancelado(
  proposta: ConfirmacaoCancelarPeriodo,
): string {
  return `Cancelei ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  })}.`;
}

export function formatarNaoEncontrado(termo: string): string {
  return `Não encontrei um Compromisso chamado “${termo}”.`;
}

export function formatarListaCandidatos(
  rotulos: string[],
  acao: "alterar" | "cancelar" = "alterar",
): string {
  const linhas = rotulos.map((r) => `• ${r}`);
  const pergunta =
    acao === "cancelar"
      ? "Qual você quer cancelar?"
      : "Qual você quer alterar?";
  return `Encontrei mais de um Compromisso. ${pergunta}\n${linhas.join("\n")}`;
}

export function rotuloCandidato(
  compromisso: Compromisso,
  agora?: DateTime,
): string {
  return formatarCompromissoNoIntervalo(compromisso, agora);
}

export function formatarConsultaDia(
  dia: string,
  compromissos: Compromisso[],
  agora?: DateTime,
): string {
  const rotulo = formatarDiaPorExtenso(dia, { agoraReferencia: agora });
  const passado = agora ? diaCivilJaPassou(dia, agora) : false;

  if (compromissos.length === 0) {
    if (passado) {
      return `${rotulo} já passou. Nada marcado nesse dia.`;
    }
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

function formatarCompromissoNoIntervalo(
  compromisso: Compromisso,
  agora?: DateTime,
): string {
  const opcoes = agora ? { agoraReferencia: agora, incluirAno: false as const } : undefined;
  if (compromisso.tipo === "pontual") {
    const dia = diaCivil(
      DateTime.fromISO(compromisso.inicio, { setZone: true }),
    );
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}, ${formatarDiaPorExtenso(dia, opcoes)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo}, ${formatarDiaPorExtenso(compromisso.primeiroDia, opcoes)}`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia, opcoes)} a ${formatarDiaPorExtenso(compromisso.ultimoDia, opcoes)}`;
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
  agora?: DateTime,
): string {
  if (primeiroDia === ultimoDia) {
    return formatarConsultaDia(primeiroDia, compromissos, agora);
  }

  const rotulo = rotuloIntervalo(primeiroDia, ultimoDia);
  const passado =
    agora &&
    DateTime.fromISO(ultimoDia, { zone: FUSO_DONO }).endOf("day") <
      agoraEmBrasilia(agora).startOf("day");
  if (compromissos.length === 0) {
    if (passado) {
      return `${rotulo} já passou. Nada marcado nesse recorte.`;
    }
    return `${rotulo} está livre.`;
  }

  const linhas = [...compromissos]
    .sort((a, b) => instanteDeOrdenacao(a).localeCompare(instanteDeOrdenacao(b)))
    .map((c) => `• ${formatarCompromissoNoIntervalo(c, agora)}`);
  return `${rotulo}:\n${linhas.join("\n")}`;
}
