import { DateTime } from "luxon";

export const FUSO_DONO = "America/Sao_Paulo";

export function agoraEmBrasilia(agora: DateTime): DateTime {
  return agora.setZone(FUSO_DONO);
}

export function diaCivil(data: DateTime): string {
  return agoraEmBrasilia(data).toISODate()!;
}

export function inicioDoDia(dia: string): DateTime {
  return DateTime.fromISO(dia, { zone: FUSO_DONO }).startOf("day");
}

export function fimDoDia(dia: string): DateTime {
  return DateTime.fromISO(dia, { zone: FUSO_DONO }).endOf("day");
}

export const MESES_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

export const NOMES_MESES_PT = [
  "",
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function formatarDiaPorExtenso(dia: string): string {
  const dt = DateTime.fromISO(dia, { zone: FUSO_DONO });
  return `${dt.day} de ${NOMES_MESES_PT[dt.month]}`;
}

export function formatarHora(iso: string): string {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(FUSO_DONO);
  if (dt.minute === 0) {
    return `${dt.hour}h`;
  }
  return `${dt.hour}h${String(dt.minute).padStart(2, "0")}`;
}

/**
 * Resolve dia/mês sem ano relativo a "agora" em Brasília:
 * se a data civil de agora já passou desse dia/mês, usa o ano seguinte.
 */
export function resolverAnoDaData(
  dia: number,
  mes: number,
  agora: DateTime,
): string {
  const base = agoraEmBrasilia(agora);
  let candidato = DateTime.fromObject(
    { year: base.year, month: mes, day: dia },
    { zone: FUSO_DONO },
  );
  if (!candidato.isValid) {
    throw new Error(`Data inválida: ${dia}/${mes}`);
  }
  if (candidato < base.startOf("day")) {
    candidato = candidato.plus({ years: 1 });
  }
  return candidato.toISODate()!;
}
