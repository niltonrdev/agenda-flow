/** Visão do dia no Google Calendar (fonte da verdade do Dono). */
export function urlVisaoDoDiaNoCalendario(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dia);
  if (!partes) {
    throw new Error(`Dia civil inválido: ${dia}`);
  }
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const diaDoMes = Number(partes[3]);
  return `https://calendar.google.com/calendar/r/day/${ano}/${mes}/${diaDoMes}`;
}
