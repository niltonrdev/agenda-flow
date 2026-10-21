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

export type IntencaoMarcarPontual = {
  tipo: "marcar_pontual";
  titulo: string;
  inicio: string;
  fim: string;
};

export type IntencaoMarcarPeriodo = {
  tipo: "marcar_periodo";
  titulo: string;
  primeiroDia: string;
  ultimoDia: string;
};

export type IntencaoConfirmar = {
  tipo: "confirmar";
};

export type IntencaoDesconhecida = {
  tipo: "desconhecida";
};

export type Intencao =
  | IntencaoConsultaDia
  | IntencaoConsultaIntervalo
  | IntencaoMarcarPontual
  | IntencaoMarcarPeriodo
  | IntencaoConfirmar
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

const RE_CONFIRMAR = /^(?:sim|confirmo|pode gravar)\s*[.!]?\s*$/u;

const RE_TEM_HORA = /\b\d{1,2}\s*h(?:\d{2})?\b|\b\d{1,2}:\d{2}\b/u;

const PALAVRA = String.raw`(?<![\p{L}\p{N}])`;
const FIM_PALAVRA = String.raw`(?![\p{L}\p{N}])`;
const HORA = String.raw`(\d{1,2})(?:h(\d{2})?|:(\d{2}))`;

const RE_INTERVALO_HORAS = new RegExp(
  `${PALAVRA}das?\\s+${HORA}\\s+[aà]s\\s+${HORA}${FIM_PALAVRA}`,
  "u",
);

const RE_HORA_INICIO = new RegExp(
  `${PALAVRA}(?:[aà]s\\s+)?${HORA}${FIM_PALAVRA}`,
  "u",
);

const RE_DURACAO =
  /\bpor\s+(?:(meia)\s+hora|(uma)\s+hora|(\d+)\s*(minutos?|min|horas?))\b/u;

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

function horaMinuto(
  hora: string,
  minutoH: string | undefined,
  minutoColon: string | undefined,
): { hour: number; minute: number } | null {
  const hour = Number(hora);
  const minute = Number(minutoH ?? minutoColon ?? "0");
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function diaDoPontual(texto: string, agora: DateTime): string | null {
  const base = agora.setZone(FUSO_DONO);
  if (new RegExp(`${PALAVRA}depois de amanh[aã]${FIM_PALAVRA}`, "u").test(texto)) {
    return base.plus({ days: 2 }).toISODate();
  }
  if (new RegExp(`${PALAVRA}amanh[aã]${FIM_PALAVRA}`, "u").test(texto)) {
    return base.plus({ days: 1 }).toISODate();
  }
  if (new RegExp(`${PALAVRA}hoje${FIM_PALAVRA}`, "u").test(texto)) {
    return base.toISODate();
  }
  const matchData = RE_DATA.exec(texto);
  if (matchData) {
    const dia = Number(matchData[1]);
    const mes = mesDe(matchData[2]);
    if (!mes || dia < 1 || dia > 31) return null;
    try {
      return resolverAnoDaData(dia, mes, agora);
    } catch {
      return null;
    }
  }
  return base.toISODate();
}

function duracaoEmMinutos(texto: string): number | null {
  const match = RE_DURACAO.exec(texto);
  if (!match) return null;
  if (match[1] === "meia") return 30;
  if (match[2] === "uma") return 60;
  const quantidade = Number(match[3]);
  const unidade = match[4] ?? "";
  if (quantidade <= 0) return null;
  if (unidade.startsWith("hora")) return quantidade * 60;
  return quantidade;
}

function tituloDoPontual(mensagemOriginal: string): string {
  let titulo = mensagemOriginal.normalize("NFC").trim();
  titulo = titulo.replace(/^\s*(?:marcar|marca|marque)\s+/iu, "");
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}depois de amanh[aã]${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}amanh[aã]${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(new RegExp(`${PALAVRA}hoje${FIM_PALAVRA}`, "giu"), " ");
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}(?:no\\s+)?dia\\s+\\d{1,2}\\s+de\\s+(?:${GRUPO_MES})${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}das?\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2})\\s+[aà]s\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2})${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}[aà]s\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2})${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}\\d{1,2}h\\d{0,2}${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}por\\s+(?:meia hora|uma hora|\\d+\\s*(?:minutos?|min|horas?))${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(/[?.!,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!titulo) return "Compromisso";
  return titulo.charAt(0).toLocaleUpperCase("pt-BR") + titulo.slice(1);
}

function montarPontual(mensagem: string, texto: string, agora: DateTime): Intencao {
  const dia = diaDoPontual(texto, agora);
  if (!dia) return { tipo: "desconhecida" };

  const base = DateTime.fromISO(dia, { zone: FUSO_DONO });
  const intervalo = RE_INTERVALO_HORAS.exec(texto);
  let inicio: DateTime;
  let fim: DateTime;

  if (intervalo) {
    const começo = horaMinuto(intervalo[1], intervalo[2], intervalo[3]);
    const termino = horaMinuto(intervalo[4], intervalo[5], intervalo[6]);
    if (!começo || !termino) return { tipo: "desconhecida" };
    inicio = base.set(começo);
    fim = base.set(termino);
    if (fim <= inicio) fim = fim.plus({ days: 1 });
  } else {
    const hora = RE_HORA_INICIO.exec(texto);
    if (!hora) return { tipo: "desconhecida" };
    const começo = horaMinuto(hora[1], hora[2], hora[3]);
    if (!começo) return { tipo: "desconhecida" };
    inicio = base.set(começo);
    const minutos = duracaoEmMinutos(texto) ?? 60;
    fim = inicio.plus({ minutes: minutos });
  }

  return {
    tipo: "marcar_pontual",
    titulo: tituloDoPontual(mensagem),
    inicio: inicio.toISO()!,
    fim: fim.toISO()!,
  };
}

/**
 * Interpretador por regras (PT-BR).
 * Consulta de dia ou intervalo, e Marcação de Pontual. Sem LLM.
 */
export function interpretarMensagem(
  mensagem: string,
  agora: DateTime,
): Intencao {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");

  if (RE_CONFIRMAR.test(texto)) {
    return { tipo: "confirmar" };
  }

  if (RE_TEM_HORA.test(texto)) {
    return montarPontual(mensagem.trim(), texto, agora);
  }

  const pedidoDeMarcacao = /^(?:marcar|marca|marque)\b/u.test(texto);
  const matchIntervalo = RE_INTERVALO.exec(texto);
  if (pedidoDeMarcacao && matchIntervalo) {
    const recorte = montarIntervalo(
      Number(matchIntervalo[1]),
      mesDe(matchIntervalo[2]),
      Number(matchIntervalo[3]),
      mesDe(matchIntervalo[4]),
      agora,
    );
    if (recorte.tipo !== "consulta_intervalo") return recorte;
    const tituloBruto = mensagem
      .trim()
      .replace(/^(?:marcar|marca|marque)\s+/iu, "")
      .replace(new RegExp(RE_INTERVALO.source, "iu"), " ")
      .replace(/\s+/g, " ")
      .trim();
    const titulo = tituloBruto
      ? tituloBruto.charAt(0).toLocaleUpperCase("pt-BR") + tituloBruto.slice(1)
      : "Compromisso";
    return {
      tipo: "marcar_periodo",
      titulo,
      primeiroDia: recorte.primeiroDia,
      ultimoDia: recorte.ultimoDia,
    };
  }

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
