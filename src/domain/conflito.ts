import type { Compromisso } from "./compromisso";
import { inicioDoDia } from "./fuso";
import { DateTime } from "luxon";

/** O que o Dono quer marcar, ainda sem id. */
export type PropostaConflito =
  | { tipo: "pontual"; inicio: string; fim: string }
  | { tipo: "periodo"; primeiroDia: string; ultimoDia: string };

function inicioPontual(iso: string): DateTime {
  return DateTime.fromISO(iso, { setZone: true });
}

/** Intervalo meio-aberto [início, fim) em instantes. */
function faixaPontual(inicio: string, fim: string): { inicio: DateTime; fim: DateTime } {
  return { inicio: inicioPontual(inicio), fim: inicioPontual(fim) };
}

/** Dias inteiros inclusive: [início do primeiro, início do dia seguinte ao último). */
function faixaPeriodo(
  primeiroDia: string,
  ultimoDia: string,
): { inicio: DateTime; fim: DateTime } {
  return {
    inicio: inicioDoDia(primeiroDia),
    fim: inicioDoDia(ultimoDia).plus({ days: 1 }),
  };
}

function faixaDe(item: PropostaConflito | Compromisso): {
  inicio: DateTime;
  fim: DateTime;
} {
  if (item.tipo === "pontual") {
    return faixaPontual(item.inicio, item.fim);
  }
  return faixaPeriodo(item.primeiroDia, item.ultimoDia);
}

function sobrepoe(
  a: { inicio: DateTime; fim: DateTime },
  b: { inicio: DateTime; fim: DateTime },
): boolean {
  return a.inicio < b.fim && a.fim > b.inicio;
}

function chaveOrdenacao(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") return compromisso.inicio;
  return inicioDoDia(compromisso.primeiroDia).toISO()!;
}

/**
 * Compromissos já no Calendário que se sobrepõem à proposta.
 * Encostar (um termina quando o outro começa) não é sobreposição.
 * O fuso entra só para achar o dia civil do Período; o relógio não é lido.
 */
export function compromissosEmConflito(
  proposta: PropostaConflito,
  existentes: Compromisso[],
): Compromisso[] {
  const faixa = faixaDe(proposta);
  return existentes
    .filter((existente) => sobrepoe(faixa, faixaDe(existente)))
    .sort((a, b) => chaveOrdenacao(a).localeCompare(chaveOrdenacao(b)));
}
