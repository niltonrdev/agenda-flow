import { FUSO_DONO, MESES_PT, resolverAnoDaData } from "./fuso";
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

export type IntencaoMarcarPeriodo = {
  tipo: "marcar_periodo";
  titulo: string;
  primeiroDia: string;
  ultimoDia: string;
};

export type IntencaoMarcarPontual = {
  tipo: "marcar_pontual";
  titulo: string;
  inicio: string;
  fim: string;
};

export type IntencaoDesconhecida = {
  tipo: "desconhecida";
};

export type Intencao =
  | IntencaoConsultaDia
  | IntencaoConsultaIntervalo
  | IntencaoMarcarPeriodo
  | IntencaoMarcarPontual
  | IntencaoDesconhecida;

export type RecorteDias = {
  primeiroDia: string;
  ultimoDia: string;
};

const GRUPO_MES =
  "janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

const RE_INTERVALO = new RegExp(
  String.raw`\b(?:(?:do|de)\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\s+(?:a|ao|até)\s+(?:o\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\b`,
  "iu",
);

const RE_PONTUAL = new RegExp(
  String.raw`^(.*?)\s+(amanh[ãa]|hoje)\s+[àa]s\s+(\d{1,2})(?:h|:)?(\d{2})?\s*$`,
  "iu",
);

const RE_DATA = new RegExp(
  String.raw`(?:^|\b)(?:dia\s+)?(\d{1,2})\s+de\s+(${GRUPO_MES})\b`,
  "iu",
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

function diaCivilValido(ano: number, mes: number, dia: number): DateTime | null {
  const dt = DateTime.fromObject(
    { year: ano, month: mes, day: dia },
    { zone: FUSO_DONO },
  );
  return dt.isValid ? dt : null;
}

function montarRecorte(
  diaInicio: number,
  mesInicio: number | undefined,
  diaFim: number,
  mesFim: number | undefined,
  agora: DateTime,
): RecorteDias | null {
  if (diaInicio < 1 || diaInicio > 31 || diaFim < 1 || diaFim > 31) {
    return null;
  }

  const base = agora.setZone(FUSO_DONO).startOf("day");

  let inicio: DateTime;
  let fim: DateTime;

  if (mesInicio == null && mesFim == null) {
    const candidato = diaCivilValido(base.year, base.month, diaInicio);
    if (!candidato) return null;
    inicio = candidato;
    if (inicio < base) {
      const proximoMes = inicio.plus({ months: 1 });
      const seguinte = diaCivilValido(proximoMes.year, proximoMes.month, diaInicio);
      if (!seguinte) return null;
      inicio = seguinte;
    }
    if (diaFim >= diaInicio) {
      const mesmo = diaCivilValido(inicio.year, inicio.month, diaFim);
      if (!mesmo) return null;
      fim = mesmo;
    } else {
      const proximo = inicio.plus({ months: 1 });
      const seguinte = diaCivilValido(proximo.year, proximo.month, diaFim);
      if (!seguinte) return null;
      fim = seguinte;
    }
  } else {
    const mesI = mesInicio ?? mesFim!;
    const mesF = mesFim ?? mesInicio!;
    inicio = DateTime.fromISO(resolverAnoDaData(diaInicio, mesI, agora), {
      zone: FUSO_DONO,
    });
    const fimNoAno = diaCivilValido(inicio.year, mesF, diaFim);
    if (!fimNoAno) return null;
    fim = fimNoAno < inicio ? fimNoAno.plus({ years: 1 }) : fimNoAno;
    if (!fim.isValid) return null;
  }

  return {
    primeiroDia: inicio.toISODate()!,
    ultimoDia: fim.toISODate()!,
  };
}

function capitalizar(titulo: string): string {
  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

/** O que sobra fora do trecho de datas vira título. Sem título, é Consulta. */
function tituloForaDoTrecho(original: string, inicio: number, fim: number): string {
  const bruto = `${original.slice(0, inicio)} ${original.slice(fim)}`
    .replace(/\s+/g, " ")
    .trim();
  const limpo = bruto
    .replace(/^(?:marca(?:r|ção|cao)?|um|uma)\s+/iu, "")
    .replace(/\s+(?:de|do|da|no|na|em|para|pra)\s*$/iu, "")
    .replace(/^(?:de|do|da|no|na|em)\s+/iu, "")
    .trim();
  if (!limpo) return "";
  return capitalizar(limpo);
}

/**
 * Interpretador por regras (PT-BR).
 * Intervalo com título propõe Período; intervalo só de datas consulta.
 * Hora ("amanhã às 15h") propõe Pontual. Sem LLM.
 */
export function interpretarMensagem(mensagem: string, agora: DateTime): Intencao {
  const original = mensagem.trim().normalize("NFC");
  const texto = original.toLowerCase();

  const matchIntervalo = RE_INTERVALO.exec(texto);
  if (matchIntervalo && matchIntervalo.index !== undefined) {
    const recorte = montarRecorte(
      Number(matchIntervalo[1]),
      mesDe(matchIntervalo[2]),
      Number(matchIntervalo[3]),
      mesDe(matchIntervalo[4]),
      agora,
    );
    if (!recorte) return { tipo: "desconhecida" };

    const titulo = tituloForaDoTrecho(
      original,
      matchIntervalo.index,
      matchIntervalo.index + matchIntervalo[0].length,
    );
    if (!titulo) {
      return { tipo: "consulta_intervalo", ...recorte };
    }
    return { tipo: "marcar_periodo", titulo, ...recorte };
  }

  const matchPontual = RE_PONTUAL.exec(texto);
  if (matchPontual) {
    const hora = Number(matchPontual[3]);
    const minuto = matchPontual[4] ? Number(matchPontual[4]) : 0;
    if (hora > 23 || minuto > 59) return { tipo: "desconhecida" };

    const titulo = capitalizar(original.slice(0, matchPontual[1].length).trim());
    if (!titulo) return { tipo: "desconhecida" };

    const base = agora.setZone(FUSO_DONO).startOf("day");
    const dia =
      matchPontual[2].normalize("NFD").replace(/\p{M}/gu, "") === "amanha"
        ? base.plus({ days: 1 })
        : base;
    const inicio = dia.set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });
    const fim = inicio.plus({ hours: 1 });

    return {
      tipo: "marcar_pontual",
      titulo,
      inicio: inicio.toISO()!,
      fim: fim.toISO()!,
    };
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

export function mensagemEhSim(mensagem: string): boolean {
  return /^(sim|sí|isso|confirmo|confirma|pode(?:\s+gravar)?)\.?!?$/iu.test(
    mensagem.trim(),
  );
}
