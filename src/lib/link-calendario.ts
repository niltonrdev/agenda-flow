import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";

/**
 * Segundos entre 1970-01-01 e 2001-01-01 UTC.
 * O esquema `calshow:` do iOS usa a epoch da Apple (NSDate), não a Unix.
 * @see https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/CalendarLinks/CalendarLinks.html
 */
export const EPOCA_APPLE_SEGUNDOS = 978_307_200;

function partesDoDia(dia: string): { ano: number; mes: number; diaDoMes: number } {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dia);
  if (!partes) {
    throw new Error(`Dia civil inválido: ${dia}`);
  }
  return {
    ano: Number(partes[1]),
    mes: Number(partes[2]),
    diaDoMes: Number(partes[3]),
  };
}

/** Visão da semana no Google Calendar, centrada no dia civil. */
export function urlVisaoDaSemanaNoCalendario(dia: string): string {
  const { ano, mes, diaDoMes } = partesDoDia(dia);
  return `https://calendar.google.com/calendar/r/week/${ano}/${mes}/${diaDoMes}`;
}

/**
 * Abre o Calendário do iPhone naquela data (`calshow:`).
 * O número é segundos desde 1/1/2001 GMT — Unix puro abre ~31 anos à frente (2026 → 2057).
 * A visão (semana/dia/mês) é a que o Dono já usa no app; o iOS não deixa forçar semana.
 */
export function urlCalendarioNativoIos(dia: string): string {
  partesDoDia(dia);
  const inicio = DateTime.fromISO(dia, { zone: FUSO_DONO }).startOf("day");
  return `calshow:${Math.floor(inicio.toSeconds()) - EPOCA_APPLE_SEGUNDOS}`;
}

/** Instantâneo UTC correspondente ao número do `calshow:`. */
export function instanteDoCalshow(url: string): DateTime {
  const match = /^calshow:(-?\d+)$/u.exec(url);
  if (!match) {
    throw new Error(`URL calshow inválida: ${url}`);
  }
  return DateTime.fromSeconds(Number(match[1]) + EPOCA_APPLE_SEGUNDOS, {
    zone: "utc",
  });
}

export function ehAparelhoIos(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/** iPhone/iPad: app Calendário. Outros: Google Calendar na semana. */
export function urlAbrirCalendario(dia: string, userAgent: string): string {
  if (ehAparelhoIos(userAgent)) {
    return urlCalendarioNativoIos(dia);
  }
  return urlVisaoDaSemanaNoCalendario(dia);
}
