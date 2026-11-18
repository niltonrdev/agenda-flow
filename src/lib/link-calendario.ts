/**
 * Links para o Google Agenda na web.
 * Não usar calshow:, webcal: nem .ics — no iPhone isso abre o Calendário da Apple.
 */

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

/** Visão do dia no Google Calendar, sem zero à esquerda no mês e no dia. */
export function urlVisaoDoDiaNoCalendario(dia: string): string {
  const { ano, mes, diaDoMes } = partesDoDia(dia);
  return `https://calendar.google.com/calendar/r/day/${ano}/${mes}/${diaDoMes}`;
}

/**
 * htmlLink do events.insert/patch/get. Só https do Google Calendar;
 * recusa calshow, webcal, ics e qualquer outro esquema.
 */
export function htmlLinkSeguro(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (path.endsWith(".ics") || path.includes(".ics")) return null;
  if (host === "calendar.google.com") return url.toString();
  if (host === "www.google.com" && path.includes("/calendar")) {
    return url.toString();
  }
  return null;
}

/**
 * Abre o evento no Google Agenda (htmlLink) ou, sem link, a visão do dia.
 * Sempre uma URL https — a UI abre em nova aba.
 */
export function urlAbrirCalendario(
  dia: string,
  htmlLink?: string | null,
): string {
  return htmlLinkSeguro(htmlLink) ?? urlVisaoDoDiaNoCalendario(dia);
}
