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

export type RecorteDias = {
  primeiroDia: string;
  ultimoDia: string;
};

/**
 * Sábado e domingo deste fim de semana (se hoje já é sábado/domingo)
 * ou do próximo, em Brasília.
 */
export function recorteFimDeSemana(agora: DateTime): RecorteDias {
  const d = agoraEmBrasilia(agora).startOf("day");
  const wd = d.weekday;
  let sabado: DateTime;
  if (wd === 6) {
    sabado = d;
  } else if (wd === 7) {
    sabado = d.minus({ days: 1 });
  } else {
    sabado = d.plus({ days: 6 - wd });
  }
  return {
    primeiroDia: sabado.toISODate()!,
    ultimoDia: sabado.plus({ days: 1 }).toISODate()!,
  };
}

/**
 * Recorte do feriado: o dia dito, mais o fim de semana colado
 * e a emenda típica (segunda↔sábado quando a folga é terça; quinta→domingo).
 */
export function recorteFeriado(dia: string): RecorteDias {
  const dt = DateTime.fromISO(dia, { zone: FUSO_DONO }).startOf("day");
  if (!dt.isValid) {
    throw new Error(`Data inválida: ${dia}`);
  }
  const wd = dt.weekday;
  let primeiro = dt;
  let ultimo = dt;
  if (wd === 1) {
    primeiro = dt.minus({ days: 2 });
  } else if (wd === 2) {
    primeiro = dt.minus({ days: 3 });
  } else if (wd === 4) {
    ultimo = dt.plus({ days: 3 });
  } else if (wd === 5) {
    ultimo = dt.plus({ days: 2 });
  } else if (wd === 6) {
    ultimo = dt.plus({ days: 1 });
  } else if (wd === 7) {
    primeiro = dt.minus({ days: 1 });
  }
  return {
    primeiroDia: primeiro.toISODate()!,
    ultimoDia: ultimo.toISODate()!,
  };
}
