import {
  FUSO_DONO,
  MESES_PT,
  recorteFeriado,
  recorteFimDeSemana,
  resolverAnoDaData,
  resolverDiaMesConsulta,
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

export type IntencaoRecusar = {
  tipo: "recusar";
};

export type DestinoAlteracao =
  | { tipo: "dia"; dia: number; mes?: number }
  | { tipo: "hora"; hora: number; minuto: number }
  | { tipo: "dia_e_hora"; dia: number; mes?: number; hora: number; minuto: number }
  | { tipo: "periodo"; primeiroDia: string; ultimoDia: string }
  | { tipo: "primeiro_dia"; primeiroDia: string }
  | { tipo: "ultimo_dia"; ultimoDia: string };

export type IntencaoAlterar = {
  tipo: "alterar";
  termo: string;
  destino: DestinoAlteracao;
};

export type DiaRecorte = {
  dia: number;
  mes?: number;
  ano?: number;
};

export type IntencaoCancelar = {
  tipo: "cancelar";
  termo: string;
  dia?: DiaRecorte;
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
  | IntencaoRecusar
  | IntencaoAlterar
  | IntencaoCancelar
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
  String.raw`(?:^|\b)(?:dia\s+)?(\d{1,2})\s+de\s+(${GRUPO_MES})(?:\s+de\s+(\d{4}))?\b`,
  "u",
);

const RE_DATA_NUM = new RegExp(
  String.raw`(?:^|\b)(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b`,
  "u",
);

const RE_CONFIRMAR = /^(?:sim|confirmo|pode gravar)\s*[.!]?\s*$/u;

const RE_RECUSAR = /^(?:n[aã]o)\s*[.!]?\s*$/u;

const RE_ALTERAR =
  /^(?:muda|mudar|altere|alterar|remarca|remarcar)(?:\s+(?:o|a))?\s+/u;

const RE_CANCELAR =
  /^(?:cancela|cancelar|cancele|desmarca|desmarcar|tira|tirar)(?:\s+(?:o|a|os|as))?\s+/u;

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

function isoDeMatchExtenso(
  match: RegExpExecArray,
  agora: DateTime,
): string | null {
  const dia = Number(match[1]);
  const mes = mesDe(match[2]);
  if (!mes || dia < 1 || dia > 31) return null;
  const ano = match[3] ? Number(match[3]) : undefined;
  try {
    return resolverDiaMesConsulta(dia, mes, agora, ano);
  } catch {
    return null;
  }
}

function isoDeMatchNumerico(
  match: RegExpExecArray,
  agora: DateTime,
): string | null {
  const dia = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const ano = match[3] ? Number(match[3]) : undefined;
  try {
    return resolverDiaMesConsulta(dia, mes, agora, ano);
  } catch {
    return null;
  }
}

function interpretarConsultaDia(
  texto: string,
  agora: DateTime,
): IntencaoConsultaDia | IntencaoDesconhecida | null {
  if (RE_TEM_HORA.test(texto)) return null;

  const matchNum = RE_DATA_NUM.exec(texto);
  if (matchNum) {
    const dia = isoDeMatchNumerico(matchNum, agora);
    if (dia) return { tipo: "consulta_dia", dia };
    return { tipo: "desconhecida" };
  }

  const matchData = RE_DATA.exec(texto);
  if (matchData) {
    const dia = isoDeMatchExtenso(matchData, agora);
    if (dia) return { tipo: "consulta_dia", dia };
    return { tipo: "desconhecida" };
  }

  return null;
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
    return isoDeMatchExtenso(matchData, agora);
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

function tituloDaMensagem(mensagemOriginal: string): string {
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
  titulo = titulo.replace(new RegExp(RE_INTERVALO.source, "giu"), " ");
  titulo = titulo.replace(/[?.!,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!titulo) return "Compromisso";
  return titulo.charAt(0).toLocaleUpperCase("pt-BR") + titulo.slice(1);
}

function resolverDiaDoMes(dia: number, agora: DateTime): string | null {
  if (dia < 1 || dia > 31) return null;
  const base = agora.setZone(FUSO_DONO).startOf("day");
  try {
    let candidato = exigirDia(base.year, base.month, dia);
    if (candidato < base) {
      const proximoMes = candidato.plus({ months: 1 });
      candidato = exigirDia(proximoMes.year, proximoMes.month, dia);
    }
    return candidato.toISODate()!;
  } catch {
    return null;
  }
}

function partesDoDia(
  texto: string,
): { dia: number; mes?: number } | null {
  const matchData = RE_DATA.exec(texto);
  if (matchData) {
    const dia = Number(matchData[1]);
    const mes = mesDe(matchData[2]);
    if (!mes || dia < 1 || dia > 31) return null;
    return {
      dia,
      mes,
      ...(matchData[3] ? { ano: Number(matchData[3]) } : {}),
    };
  }
  const matchNum = RE_DATA_NUM.exec(texto);
  if (matchNum) {
    const dia = Number(matchNum[1]);
    const mes = Number(matchNum[2]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return {
      dia,
      mes,
      ...(matchNum[3] ? { ano: Number(matchNum[3]) } : {}),
    };
  }
  const matchDia = /(?:^|\b)(?:o\s+)?dia\s+(\d{1,2})\b/u.exec(texto);
  if (matchDia) {
    const dia = Number(matchDia[1]);
    if (dia < 1 || dia > 31) return null;
    return { dia };
  }
  return null;
}

function diaIsoDeTexto(texto: string, agora: DateTime): string | null {
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
    return isoDeMatchExtenso(matchData, agora);
  }
  const matchNum = RE_DATA_NUM.exec(texto);
  if (matchNum) {
    return isoDeMatchNumerico(matchNum, agora);
  }
  const matchDia = /(?:^|\b)(?:o\s+)?dia\s+(\d{1,2})\b/u.exec(texto);
  if (matchDia) {
    return resolverDiaDoMes(Number(matchDia[1]), agora);
  }
  return null;
}

export function interpretarDestinoAlteracao(
  textoDestino: string,
  agora: DateTime,
): DestinoAlteracao | null {
  const texto = textoDestino.trim().toLowerCase().normalize("NFC");
  if (!texto) return null;

  const aPartir = /(?:a\s+partir\s+d[eo]|come[cç]a(?:ndo)?(?:\s+no)?)\s+/u.test(texto);
  const ate = new RegExp(`${PALAVRA}at[eé]${FIM_PALAVRA}`, "u").test(texto);

  const matchIntervalo = RE_INTERVALO.exec(texto);
  if (matchIntervalo) {
    const recorte = montarIntervalo(
      Number(matchIntervalo[1]),
      mesDe(matchIntervalo[2]),
      Number(matchIntervalo[3]),
      mesDe(matchIntervalo[4]),
      agora,
    );
    if (recorte.tipo !== "consulta_intervalo") return null;
    return {
      tipo: "periodo",
      primeiroDia: recorte.primeiroDia,
      ultimoDia: recorte.ultimoDia,
    };
  }

  const diaIso = diaIsoDeTexto(texto, agora);
  const partes = partesDoDia(texto);
  const horaMatch = RE_HORA_INICIO.exec(texto);
  const hora = horaMatch
    ? horaMinuto(horaMatch[1], horaMatch[2], horaMatch[3])
    : null;

  if (aPartir && diaIso) {
    return { tipo: "primeiro_dia", primeiroDia: diaIso };
  }
  if (ate && diaIso) {
    return { tipo: "ultimo_dia", ultimoDia: diaIso };
  }
  if (partes && hora) {
    return {
      tipo: "dia_e_hora",
      dia: partes.dia,
      ...(partes.mes != null ? { mes: partes.mes } : {}),
      hora: hora.hour,
      minuto: hora.minute,
    };
  }
  if (hora && !partes) {
    return { tipo: "hora", hora: hora.hour, minuto: hora.minute };
  }
  if (partes) {
    return {
      tipo: "dia",
      dia: partes.dia,
      ...(partes.mes != null ? { mes: partes.mes } : {}),
    };
  }
  return null;
}

function termoDeAlteracao(trecho: string): string {
  return trecho
    .replace(/^(?:o|a|os|as)\s+/iu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

function termoDeCancelamento(trecho: string): string {
  return trecho
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:o|a|os|as|da|do|de|na|no|em)\s+/iu, "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

function montarCancelar(mensagem: string): Intencao {
  const semVerbo = mensagem.trim().replace(RE_CANCELAR, "");
  const texto = semVerbo.toLowerCase().normalize("NFC");
  const matchData = RE_DATA.exec(texto);
  const matchDia = /(?:^|\b)(?:o\s+)?dia\s+(\d{1,2})\b/u.exec(texto);

  let dia: DiaRecorte | undefined;
  let semDia = semVerbo;
  const match = matchData ?? matchDia;
  if (match && match.index != null) {
    const numero = Number(match[1]);
    if (numero >= 1 && numero <= 31) {
      dia = matchData
        ? { dia: numero, ...(mesDe(matchData[2]) != null ? { mes: mesDe(matchData[2]) } : {}) }
        : { dia: numero };
      semDia =
        semVerbo.slice(0, match.index) +
        semVerbo.slice(match.index + match[0].length);
    }
  }

  const termo = termoDeCancelamento(semDia);
  if (!termo) return { tipo: "desconhecida" };
  return dia ? { tipo: "cancelar", termo, dia } : { tipo: "cancelar", termo };
}

function montarAlterar(mensagem: string, agora: DateTime): Intencao {
  const semVerbo = mensagem.trim().replace(RE_ALTERAR, "");
  let termoBruto = semVerbo;
  let destinoBruto = "";

  const partesPara = semVerbo.split(/\s+para\s+/iu);
  if (partesPara.length > 1) {
    termoBruto = partesPara[0];
    destinoBruto = partesPara.slice(1).join(" para ");
  } else {
    const sufixo = /\s+((?:a\s+partir|at[eé]|come[cç]a).+)$/iu.exec(semVerbo);
    if (!sufixo) return { tipo: "desconhecida" };
    termoBruto = semVerbo.slice(0, sufixo.index);
    destinoBruto = sufixo[1];
  }

  const termo = termoDeAlteracao(termoBruto);
  const destino = interpretarDestinoAlteracao(destinoBruto, agora);
  if (!termo || !destino) return { tipo: "desconhecida" };
  return { tipo: "alterar", termo, destino };
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
    titulo: tituloDaMensagem(mensagem),
    inicio: inicio.toISO()!,
    fim: fim.toISO()!,
  };
}

/**
 * Interpretador por regras (PT-BR).
 * Consulta, Marcação, Alteração e Cancelamento por regras (PT-BR). Sem LLM.
 */
export function interpretarMensagem(
  mensagem: string,
  agora: DateTime,
): Intencao {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");

  if (RE_CONFIRMAR.test(texto)) {
    return { tipo: "confirmar" };
  }

  if (RE_RECUSAR.test(texto)) {
    return { tipo: "recusar" };
  }

  if (RE_ALTERAR.test(texto)) {
    return montarAlterar(mensagem.trim(), agora);
  }

  if (RE_CANCELAR.test(texto)) {
    return montarCancelar(mensagem.trim());
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

  const consultaDia = interpretarConsultaDia(texto, agora);
  if (consultaDia) {
    return consultaDia;
  }

  return { tipo: "desconhecida" };
}
