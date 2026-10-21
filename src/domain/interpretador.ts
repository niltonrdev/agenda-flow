import {
  FUSO_DONO,
  MESES_PT,
  recorteFeriado,
  recorteFimDeSemana,
  resolverAnoDaData,
} from "./fuso";
import { DateTime } from "luxon";

export type IntencaoConsultaDia = {
  tipo: "consulta_dia";
  dia: string;
};

export type IntencaoConsultaIntervalo = {
  tipo: "consulta_intervalo";
  primeiroDia: string;
  ultimoDia: string;
};

export type IntencaoDesconhecida = {
  tipo: "desconhecida";
};

export type Intencao =
  | IntencaoConsultaDia
  | IntencaoConsultaIntervalo
  | IntencaoDesconhecida;

const GRUPO_MES =
  "janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

const RE_INTERVALO = new RegExp(
  String.raw`\b(?:(?:do|de)\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\s+(?:a|ao|até)\s+(?:o\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\b`,
  "u",
);

const RE_FERIADO = new RegExp(
  String.raw`\bferiado\s+(?:de\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(${GRUPO_MES})\b`,
  "u",
);

const RE_FIM_DE_SEMANA =
  /\b(?:(?:esse|este|neste)\s+)?(?:fim|final)\s+de\s+semana\b/u;

const RE_DATA = new RegExp(
  String.raw`(?:^|\b)(?:dia\s+)?(\d{1,2})\s+de\s+(${GRUPO_MES})\b`,
  "u",
);

function normalizarMes(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function mesDe(nome: string | undefined): number | undefined {
  if (!nome) return undefined;
  return MESES_PT[normalizarMes(nome)];
}

function diaCivilValido(
  ano: number,
  mes: number,
  dia: number,
): DateTime | null {
  const dt = DateTime.fromObject(
    { year: ano, month: mes, day: dia },
    { zone: FUSO_DONO },
  );
  return dt.isValid ? dt : null;
}

function exigirDia(ano: number, mes: number, dia: number): DateTime {
  const dt = diaCivilValido(ano, mes, dia);
  if (!dt) {
    throw new Error(`Data inválida: ${dia}/${mes}/${ano}`);
  }
  return dt;
}

function montarIntervalo(
  diaInicio: number,
  mesInicio: number | undefined,
  diaFim: number,
  mesFim: number | undefined,
  agora: DateTime,
): Intencao {
  if (diaInicio < 1 || diaInicio > 31 || diaFim < 1 || diaFim > 31) {
    return { tipo: "desconhecida" };
  }

  const base = agora.setZone(FUSO_DONO).startOf("day");

  try {
    let inicio: DateTime;
    let fim: DateTime;

    if (mesInicio == null && mesFim == null) {
      inicio = exigirDia(base.year, base.month, diaInicio);
      if (inicio < base) {
        const proximoMes = inicio.plus({ months: 1 });
        inicio = exigirDia(proximoMes.year, proximoMes.month, diaInicio);
      }
      if (diaFim >= diaInicio) {
        fim = exigirDia(inicio.year, inicio.month, diaFim);
      } else {
        const proximo = inicio.plus({ months: 1 });
        fim = exigirDia(proximo.year, proximo.month, diaFim);
      }
    } else {
      const mesI = mesInicio ?? mesFim!;
      const mesF = mesFim ?? mesInicio!;
      inicio = DateTime.fromISO(resolverAnoDaData(diaInicio, mesI, agora), {
        zone: FUSO_DONO,
      });
      fim = exigirDia(inicio.year, mesF, diaFim);
      if (fim < inicio) {
        fim = fim.plus({ years: 1 });
      }
    }

    return {
      tipo: "consulta_intervalo",
      primeiroDia: inicio.toISODate()!,
      ultimoDia: fim.toISODate()!,
    };
  } catch {
    return { tipo: "desconhecida" };
  }
}

/**
 * Interpretador por regras (PT-BR).
 * Ticket 02: Consulta de um dia ou de um intervalo. Sem LLM.
 */
export function interpretarMensagem(
  mensagem: string,
  agora: DateTime,
): Intencao {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");

  const matchIntervalo = RE_INTERVALO.exec(texto);
  if (matchIntervalo) {
    return montarIntervalo(
      Number(matchIntervalo[1]),
      mesDe(matchIntervalo[2]),
      Number(matchIntervalo[3]),
      mesDe(matchIntervalo[4]),
      agora,
    );
  }

  const matchFeriado = RE_FERIADO.exec(texto);
  if (matchFeriado) {
    const dia = Number(matchFeriado[1]);
    const mes = mesDe(matchFeriado[2]);
    if (!mes || dia < 1 || dia > 31) {
      return { tipo: "desconhecida" };
    }
    try {
      const diaIso = resolverAnoDaData(dia, mes, agora);
      const recorte = recorteFeriado(diaIso);
      return { tipo: "consulta_intervalo", ...recorte };
    } catch {
      return { tipo: "desconhecida" };
    }
  }

  if (RE_FIM_DE_SEMANA.test(texto) && !RE_DATA.test(texto)) {
    const recorte = recorteFimDeSemana(agora);
    return { tipo: "consulta_intervalo", ...recorte };
  }

  const matchData = RE_DATA.exec(texto);
  if (matchData) {
    const dia = Number(matchData[1]);
    const mes = mesDe(matchData[2]);

    if (!mes || dia < 1 || dia > 31) {
      return { tipo: "desconhecida" };
    }

    try {
      return {
        tipo: "consulta_dia",
        dia: resolverAnoDaData(dia, mes, agora),
      };
    } catch {
      return { tipo: "desconhecida" };
    }
  }

  return { tipo: "desconhecida" };
}
