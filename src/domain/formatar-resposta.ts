import type { ConfirmacaoPendente } from "./confirmacao";
import type { Compromisso } from "./compromisso";
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

function formatarCompromisso(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo} (dia inteiro)`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia)} a ${formatarDiaPorExtenso(compromisso.ultimoDia)}`;
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

export function formatarConfirmacao(proposta: ConfirmacaoPendente): string {
  if (proposta.tipo === "periodo") {
    return `Vou marcar ${proposta.titulo}, de ${formatarDiaPorExtenso(proposta.primeiroDia)} a ${formatarDiaPorExtenso(proposta.ultimoDia)}, dia inteiro. Posso gravar?`;
  }
  const dia = diaCivil(DateTime.fromISO(proposta.inicio, { setZone: true }));
  return `Vou marcar ${proposta.titulo} em ${formatarDiaPorExtenso(dia)}, ${formatarHora(proposta.inicio)}–${formatarHora(proposta.fim)}. Posso gravar?`;
}

export function formatarGravado(proposta: ConfirmacaoPendente): string {
  if (proposta.tipo === "periodo") {
    return `${proposta.titulo} ficou marcado, de ${formatarDiaPorExtenso(proposta.primeiroDia)} a ${formatarDiaPorExtenso(proposta.ultimoDia)}.`;
  }
  const dia = diaCivil(DateTime.fromISO(proposta.inicio, { setZone: true }));
  return `${proposta.titulo} ficou marcado em ${formatarDiaPorExtenso(dia)}, ${formatarHora(proposta.inicio)}–${formatarHora(proposta.fim)}.`;
}
