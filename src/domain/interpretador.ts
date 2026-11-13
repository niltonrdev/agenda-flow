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

/** Pedido de marcar com dia, mas sem horário — a Conversa pede o horário. */
export type IntencaoMarcarPontualSemHora = {
  tipo: "marcar_pontual_sem_hora";
  titulo: string;
  dia: string;
};

/** Pedido de marcar sem dia nem horário (ex.: "marcar reunião então"). */
export type IntencaoMarcarIncompleta = {
  tipo: "marcar_incompleta";
  titulo: string;
};

export type IntencaoMarcarPeriodo = {
  tipo: "marcar_periodo";
  titulo: string;
  primeiroDia: string;
  ultimoDia: string;
};

/** Viagem (ou similar) sem intervalo: a Conversa pergunta se é 1 dia ou mais. */
export type IntencaoMarcarPeriodoSemDuracao = {
  tipo: "marcar_periodo_sem_duracao";
  titulo: string;
  dia?: string;
};

export type RespostaDuracaoPeriodo =
  | { tipo: "um_dia" }
  | { tipo: "mais_dias" }
  | { tipo: "quantidade_dias"; dias: number }
  | { tipo: "intervalo"; primeiroDia: string; ultimoDia: string }
  | { tipo: "dia"; dia: string };

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
  /** Recorte opcional para achar o Compromisso (ex.: "do dia 29/11"). */
  dia?: DiaRecorte;
};

/** "alterar a viagem" sem dizer o destino — a Conversa pergunta para quando. */
export type IntencaoAlterarSemDestino = {
  tipo: "alterar_sem_destino";
  termo: string;
  dia?: DiaRecorte;
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

/** Filtros da resposta enquanto a Conversa lista candidatos. */
export type FiltrosEscolha = {
  /** 1-based; "a segunda", "2". */
  posicao?: number;
  ultima?: boolean;
  dia?: DiaRecorte;
  hora?: { hour: number; minute: number };
  termo: string;
};

export type Intencao =
  | IntencaoConsultaDia
  | IntencaoConsultaIntervalo
  | IntencaoMarcarPontual
  | IntencaoMarcarPontualSemHora
  | IntencaoMarcarIncompleta
  | IntencaoMarcarPeriodo
  | IntencaoMarcarPeriodoSemDuracao
  | IntencaoConfirmar
  | IntencaoRecusar
  | IntencaoAlterar
  | IntencaoAlterarSemDestino
  | IntencaoCancelar
  | IntencaoDesconhecida;

const GRUPO_MES =
  "janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

/** Intervalo por extenso; não casa pedaço de DD/MM (lookbehind evita "11 a 01" em "29/11 a 01/12"). */
const RE_INTERVALO = new RegExp(
  String.raw`(?<![\d/])(?:(?:do|de)\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\s+(?:a|ao|até)\s+(?:o\s+)?(?:dias?\s+)?(\d{1,2})(?:\s+de\s+(${GRUPO_MES}))?\b`,
  "u",
);

/** Intervalo numérico: 29/11 a 01/12 ou 29/11/2026 a 01/12/2026. */
const RE_INTERVALO_NUM = new RegExp(
  String.raw`(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(?:a|ao|até)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b`,
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

/** Formas longas antes das curtas (senão "remarca" engole "remarcar"). `i` para Remarcar/Cancela. */
const RE_ALTERAR =
  /^(?:mudar|muda|alterar|altere|remarcar|remarca)(?:\s+(?:o|a|os|as))?(?:\s+|$)/iu;

const RE_CANCELAR =
  /^(?:cancelar|cancela|cancele|desmarcar|desmarca|tirar|tira|apagar|apaga|apague|excluir|exclui|delete)(?:\s+(?:o|a|os|as))?(?:\s+|$)/iu;

const RE_DEITICO =
  /^(?:ess[ea]s?|est[ea]s?|isso|aquel[ea]s?)(?:\s+compromissos?)?$/u;

const RE_PREFIXO_ESCOLHA =
  /^(?:a|o|essa|esse|este|esta|quero(?:\s+(?:a|o))?)(?:\s+(?:de|do|da|com))?\s+/iu;

const PALAVRA = String.raw`(?<![\p{L}\p{N}])`;
const FIM_PALAVRA = String.raw`(?![\p{L}\p{N}])`;
/** 5h, 5hs, 5h30, 5:30, 5:30h, 5 hrs, 5 horas */
const HORA = String.raw`(\d{1,2})(?:h(?:s)?(\d{2})?|:(\d{2})h?s?|\s*hrs?|\s*horas?)`;

const RE_TEM_HORA = new RegExp(
  [
    `${PALAVRA}\\d{1,2}\\s*hs?(?:\\d{2})?${FIM_PALAVRA}`,
    `${PALAVRA}\\d{1,2}\\s+hrs?${FIM_PALAVRA}`,
    `${PALAVRA}\\d{1,2}:\\d{2}h?s?${FIM_PALAVRA}`,
    `${PALAVRA}\\d{1,2}\\s+horas?${FIM_PALAVRA}`,
    `${PALAVRA}[aà]s\\s+\\d{1,2}${FIM_PALAVRA}`,
    `${PALAVRA}\\d{1,2}(?:h\\d{0,2}|:\\d{2}h?)?\\s+da\\s+(?:manh[aã]|tarde|noite)${FIM_PALAVRA}`,
  ].join("|"),
  "u",
);

const RE_HORA_SO_AS = new RegExp(
  `${PALAVRA}[aà]s\\s+(\\d{1,2})${FIM_PALAVRA}`,
  "u",
);

const RE_MARCAR =
  /\b(?:marcar|marca|marque|agendar|agende)\b/u;

const RE_VIAGEM =
  /\bviage(?:m|ns)\b|\bviaj(?:ar|o|a|amos|ei|aremos)\b/u;

const RE_UM_DIA =
  /^(?:(?:s[oó]|apenas|somente)\s+)?(?:1|um)\s+dias?\s*[.!]?\s*$/u;

const RE_MAIS_DIAS =
  /^(?:mais(?:\s+de\s+um)?\s+dias?|v[aá]rios(?:\s+dias)?|alguns\s+dias)\s*[.!]?\s*$/u;

const RE_QUANTIDADE_DIAS =
  /\b(?:por\s+)?(\d{1,2})\s+dias?\b/u;

const RE_INTERVALO_HORAS = new RegExp(
  `${PALAVRA}das?\\s+${HORA}\\s+[aà]s\\s+${HORA}${FIM_PALAVRA}`,
  "u",
);

const RE_HORA_INICIO = new RegExp(
  `${PALAVRA}(?:[aà]s\\s+)?${HORA}${FIM_PALAVRA}`,
  "u",
);

const RE_HORA_PERIODO = new RegExp(
  `${PALAVRA}(?:[aà]s\\s+)?(\\d{1,2})(?:h(\\d{2})?|:(\\d{2})h?)?\\s+da\\s+(manh[aã]|tarde|noite)${FIM_PALAVRA}`,
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
  const baseMes = DateTime.fromObject(
    { year: ano, month: mes, day: 1 },
    { zone: FUSO_DONO },
  );
  if (!baseMes.isValid || mes < 1 || mes > 12 || dia < 1) {
    throw new Error(`Data inválida: ${dia}/${mes}/${ano}`);
  }
  const diaAjustado = Math.min(dia, baseMes.endOf("month").day);
  const dt = diaCivilValido(ano, mes, diaAjustado);
  if (!dt) {
    throw new Error(`Data inválida: ${dia}/${mes}/${ano}`);
  }
  return dt;
}

function montarIntervaloNumerico(
  match: RegExpExecArray,
  agora: DateTime,
): Intencao {
  const diaI = Number(match[1]);
  const mesI = Number(match[2]);
  const anoI = match[3] ? Number(match[3]) : undefined;
  const diaF = Number(match[4]);
  const mesF = Number(match[5]);
  const anoF = match[6] ? Number(match[6]) : undefined;
  if (
    mesI < 1 ||
    mesI > 12 ||
    mesF < 1 ||
    mesF > 12 ||
    diaI < 1 ||
    diaI > 31 ||
    diaF < 1 ||
    diaF > 31
  ) {
    return { tipo: "desconhecida" };
  }
  try {
    const primeiroDia = resolverDiaMesConsulta(diaI, mesI, agora, anoI);
    let ultimo = DateTime.fromISO(
      resolverDiaMesConsulta(diaF, mesF, agora, anoF),
      { zone: FUSO_DONO },
    );
    const primeiro = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
    if (ultimo < primeiro) {
      ultimo = ultimo.plus({ years: 1 });
    }
    return {
      tipo: "consulta_intervalo",
      primeiroDia,
      ultimoDia: ultimo.toISODate()!,
    };
  } catch {
    return { tipo: "desconhecida" };
  }
}

/** Extrai intervalo por DD/MM ou por extenso. */
export function extrairIntervalo(
  texto: string,
  agora: DateTime,
): IntencaoConsultaIntervalo | IntencaoDesconhecida | null {
  const normalizado = texto.trim().toLowerCase().normalize("NFC");
  const matchNum = RE_INTERVALO_NUM.exec(normalizado);
  if (matchNum) {
    const recorte = montarIntervaloNumerico(matchNum, agora);
    return recorte.tipo === "consulta_intervalo" || recorte.tipo === "desconhecida"
      ? recorte
      : null;
  }
  const match = RE_INTERVALO.exec(normalizado);
  if (!match) return null;
  return montarIntervalo(
    Number(match[1]),
    mesDe(match[2]),
    Number(match[3]),
    mesDe(match[4]),
    agora,
  ) as IntencaoConsultaIntervalo | IntencaoDesconhecida;
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

/** "5 da manhã" → 05:00; "5 da tarde/noite" → 17:00. */
function aplicarPeriodoDoDia(
  base: { hour: number; minute: number },
  periodo: string,
): { hour: number; minute: number } | null {
  const p = periodo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const { minute } = base;
  let hour = base.hour;

  if (p.startsWith("manh")) {
    if (hour === 12) hour = 0;
    if (hour > 11) return null;
    return { hour, minute };
  }
  if (p === "tarde" || p === "noite") {
    if (hour === 12) return { hour: p === "noite" ? 0 : 12, minute };
    if (hour >= 1 && hour <= 11) return { hour: hour + 12, minute };
    if (hour >= 13 && hour <= 23) return { hour, minute };
    return null;
  }
  return null;
}

function extrairHoraInicio(
  texto: string,
): { hour: number; minute: number } | null {
  const periodo = RE_HORA_PERIODO.exec(texto);
  if (periodo) {
    const base = horaMinuto(periodo[1], periodo[2], periodo[3]);
    if (!base) return null;
    return aplicarPeriodoDoDia(base, periodo[4]);
  }
  const hora = RE_HORA_INICIO.exec(texto);
  if (hora) {
    return horaMinuto(hora[1], hora[2], hora[3]);
  }
  const soAs = RE_HORA_SO_AS.exec(texto);
  if (!soAs) return null;
  return horaMinuto(soAs[1], undefined, undefined);
}

/** Dia dito na Mensagem; null se não houver data explícita. */
export function diaExplicitoNaMensagem(
  texto: string,
  agora: DateTime,
): string | null {
  const base = agora.setZone(FUSO_DONO);
  const normalizado = texto.trim().toLowerCase().normalize("NFC");
  if (
    new RegExp(`${PALAVRA}depois de amanh[aã]${FIM_PALAVRA}`, "u").test(
      normalizado,
    )
  ) {
    return base.plus({ days: 2 }).toISODate();
  }
  if (new RegExp(`${PALAVRA}amanh[aã]${FIM_PALAVRA}`, "u").test(normalizado)) {
    return base.plus({ days: 1 }).toISODate();
  }
  if (new RegExp(`${PALAVRA}hoje${FIM_PALAVRA}`, "u").test(normalizado)) {
    return base.toISODate();
  }
  const matchData = RE_DATA.exec(normalizado);
  if (matchData) {
    return isoDeMatchExtenso(matchData, agora);
  }
  const matchNum = RE_DATA_NUM.exec(normalizado);
  if (matchNum) {
    return isoDeMatchNumerico(matchNum, agora);
  }
  return null;
}

function diaDoPontual(texto: string, agora: DateTime): string | null {
  return (
    diaExplicitoNaMensagem(texto, agora) ??
    agora.setZone(FUSO_DONO).toISODate()
  );
}

export function mensagemTemHora(texto: string): boolean {
  return RE_TEM_HORA.test(texto.trim().toLowerCase().normalize("NFC"));
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

export function mensagemFalaDeViagem(texto: string): boolean {
  return RE_VIAGEM.test(texto);
}

export function ehPedidoDeMarcacao(texto: string): boolean {
  return RE_MARCAR.test(texto);
}

function capitalizarTitulo(titulo: string): string {
  const limpo = titulo.replace(/\s+/g, " ").trim();
  if (!limpo) return "Compromisso";
  return limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1);
}

function tituloDaViagem(mensagemOriginal: string): string {
  const titulo = tituloDaMensagem(mensagemOriginal);
  const invertido = /^(.+?)\s+viagem$/iu.exec(titulo);
  if (invertido) {
    const dest = invertido[1].replace(/^(?:para|pra|em)\s+/iu, "").trim();
    return dest ? `Viagem ${capitalizarTitulo(dest)}` : "Viagem";
  }
  return titulo;
}

function periodoPorQuantidade(
  primeiroDia: string,
  dias: number,
): { primeiroDia: string; ultimoDia: string } | null {
  if (dias < 1) return null;
  const inicio = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
  if (!inicio.isValid) return null;
  return {
    primeiroDia,
    ultimoDia: inicio.plus({ days: dias - 1 }).toISODate()!,
  };
}

/** Resposta enquanto a Conversa pergunta a duração da viagem. */
export function interpretarRespostaDuracao(
  mensagem: string,
  agora: DateTime,
  diaSugerido?: string,
): RespostaDuracaoPeriodo | null {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");
  if (!texto) return null;

  const recorte = extrairIntervalo(texto, agora);
  if (recorte?.tipo === "consulta_intervalo") {
    return {
      tipo: "intervalo",
      primeiroDia: recorte.primeiroDia,
      ultimoDia: recorte.ultimoDia,
    };
  }

  if (RE_UM_DIA.test(texto)) return { tipo: "um_dia" };
  if (RE_MAIS_DIAS.test(texto)) return { tipo: "mais_dias" };

  const quantidade = RE_QUANTIDADE_DIAS.exec(texto);
  if (quantidade) {
    const dias = Number(quantidade[1]);
    if (dias >= 1) return { tipo: "quantidade_dias", dias };
  }

  const dia = diaExplicitoNaMensagem(texto, agora);
  if (dia) return { tipo: "dia", dia };

  if (diaSugerido && RE_UM_DIA.test(texto)) return { tipo: "um_dia" };
  return null;
}

export function periodoAPartirDaDuracao(
  resposta: RespostaDuracaoPeriodo,
  diaSugerido?: string,
): { primeiroDia: string; ultimoDia: string } | null {
  if (resposta.tipo === "intervalo") {
    return { primeiroDia: resposta.primeiroDia, ultimoDia: resposta.ultimoDia };
  }
  if (resposta.tipo === "dia") {
    return { primeiroDia: resposta.dia, ultimoDia: resposta.dia };
  }
  if (resposta.tipo === "um_dia" && diaSugerido) {
    return { primeiroDia: diaSugerido, ultimoDia: diaSugerido };
  }
  if (resposta.tipo === "quantidade_dias" && diaSugerido) {
    return periodoPorQuantidade(diaSugerido, resposta.dias);
  }
  return null;
}

function tituloDaMensagem(mensagemOriginal: string): string {
  let titulo = mensagemOriginal.normalize("NFC").trim();
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}(?:marcar|marca|marque|agendar|agende)${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(/^\s*(?:uma|um|a|o)\s+/iu, "");
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}ent[aã]o${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}depois de amanh[aã]${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(`${PALAVRA}amanh[aã]${FIM_PALAVRA}`, "giu"),
    " ",
  );
  titulo = titulo.replace(new RegExp(`${PALAVRA}hoje${FIM_PALAVRA}`, "giu"), " ");
  titulo = titulo.replace(new RegExp(RE_INTERVALO_NUM.source, "giu"), " ");
  titulo = titulo.replace(new RegExp(RE_INTERVALO.source, "giu"), " ");
  titulo = titulo.replace(/\bpara\s+os\s+dias?\b/giu, " ");
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}(?:no\\s+)?(?:dia\\s+)?\\d{1,2}\\s+de\\s+(?:${GRUPO_MES})(?:\\s+de\\s+\\d{4})?${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}(?:dia\\s+)?\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}das?\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2}h?|\\s*horas?)\\s+[aà]s\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2}h?|\\s*horas?)${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}(?:[aà]s\\s+)?\\d{1,2}(?:h\\d{0,2}|:\\d{2}h?)?\\s+da\\s+(?:manh[aã]|tarde|noite)${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}[aà]s\\s+\\d{1,2}(?:h\\d{0,2}|:\\d{2}h?s?|\\s*hrs?|\\s*horas?)?${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}\\d{1,2}(?:hs?(?:\\d{2})?|:\\d{2}h?s?|\\s+hrs?|\\s+horas?)${FIM_PALAVRA}`,
      "giu",
    ),
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
  const texto = textoDestino
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/^(?:para\s+)/u, "");
  if (!texto) return null;

  const aPartir = /(?:a\s+partir\s+d[eo]|come[cç]a(?:ndo)?(?:\s+no)?)\s+/u.test(texto);
  const ate = new RegExp(`${PALAVRA}at[eé]${FIM_PALAVRA}`, "u").test(texto);

  const recorteIntervalo = extrairIntervalo(texto, agora);
  if (recorteIntervalo) {
    if (recorteIntervalo.tipo !== "consulta_intervalo") return null;
    return {
      tipo: "periodo",
      primeiroDia: recorteIntervalo.primeiroDia,
      ultimoDia: recorteIntervalo.ultimoDia,
    };
  }

  const diaIso = diaIsoDeTexto(texto, agora);
  const partes = partesDoDia(texto);
  const hora = extrairHoraInicio(texto);

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

function extrairDiaRecorteDoTexto(texto: string): {
  dia?: DiaRecorte;
  semDia: string;
} {
  const normalizado = texto.toLowerCase().normalize("NFC");
  const matchNum =
    /(?:^|\b)(?:(?:do|de|no|em)\s+)?(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u.exec(
      normalizado,
    );
  if (matchNum && matchNum.index != null) {
    const diaN = Number(matchNum[1]);
    const mesN = Number(matchNum[2]);
    if (diaN >= 1 && diaN <= 31 && mesN >= 1 && mesN <= 12) {
      return {
        dia: {
          dia: diaN,
          mes: mesN,
          ...(matchNum[3] ? { ano: Number(matchNum[3]) } : {}),
        },
        semDia:
          texto.slice(0, matchNum.index) +
          texto.slice(matchNum.index + matchNum[0].length),
      };
    }
  }

  const matchData = RE_DATA.exec(normalizado);
  if (matchData && matchData.index != null) {
    const numero = Number(matchData[1]);
    const mes = mesDe(matchData[2]);
    if (numero >= 1 && numero <= 31 && mes) {
      return {
        dia: {
          dia: numero,
          mes,
          ...(matchData[3] ? { ano: Number(matchData[3]) } : {}),
        },
        semDia:
          texto.slice(0, matchData.index) +
          texto.slice(matchData.index + matchData[0].length),
      };
    }
  }

  const matchDia = /(?:^|\b)(?:(?:do|de|no|em)\s+)?(?:o\s+)?dia\s+(\d{1,2})\b/u.exec(
    normalizado,
  );
  if (matchDia && matchDia.index != null) {
    const numero = Number(matchDia[1]);
    if (numero >= 1 && numero <= 31) {
      return {
        dia: { dia: numero },
        semDia:
          texto.slice(0, matchDia.index) +
          texto.slice(matchDia.index + matchDia[0].length),
      };
    }
  }

  return { semDia: texto };
}

function termoDeAlteracao(trecho: string): string {
  const termo = trecho
    .replace(/^(?:o|a|os|as)\s+/iu, "")
    .replace(/^(?:data|hora|hor[aá]rio|t[ií]tulo)\s+(?:d[aoe]\s+)?/iu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFC");
  if (!termo || RE_DEITICO.test(termo)) return "";
  return termo;
}

function termoDeCancelamento(trecho: string): string {
  const termo = trecho
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:o|a|os|as|da|do|de|na|no|em)\s+/iu, "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
  if (!termo || RE_DEITICO.test(termo)) return "";
  return termo;
}

function montarCancelar(mensagem: string): Intencao {
  const semVerbo = mensagem.trim().replace(RE_CANCELAR, "");
  const { dia, semDia } = extrairDiaRecorteDoTexto(semVerbo);
  const termo = termoDeCancelamento(semDia);
  return dia ? { tipo: "cancelar", termo, dia } : { tipo: "cancelar", termo };
}

const ORDINAIS_ESCOLHA: { re: RegExp; valor: number | "ultima" }[] = [
  { re: /^(?:a|o)?\s*(?:primeira|primeiro|1[ªºao]?)\s*[.!]?\s*$/iu, valor: 1 },
  { re: /^(?:a|o)?\s*(?:segunda|segundo|2[ªºao]?)\s*[.!]?\s*$/iu, valor: 2 },
  { re: /^(?:a|o)?\s*(?:terceira|terceiro|3[ªºao]?)\s*[.!]?\s*$/iu, valor: 3 },
  { re: /^(?:a|o)?\s*(?:quarta|quarto|4[ªºao]?)\s*[.!]?\s*$/iu, valor: 4 },
  { re: /^(?:a|o)?\s*(?:quinta|quinto|5[ªºao]?)\s*[.!]?\s*$/iu, valor: 5 },
  { re: /^(?:a|o)?\s*(?:sexta|sexto|6[ªºao]?)\s*[.!]?\s*$/iu, valor: 6 },
  { re: /^(?:a|o)?\s*(?:s[eé]tima|s[eé]timo|7[ªºao]?)\s*[.!]?\s*$/iu, valor: 7 },
  { re: /^(?:a|o)?\s*(?:oitava|oitavo|8[ªºao]?)\s*[.!]?\s*$/iu, valor: 8 },
  { re: /^(?:a|o)?\s*(?:nona|nono|9[ªºao]?)\s*[.!]?\s*$/iu, valor: 9 },
  { re: /^(?:a|o)?\s*(?:d[eé]cima|d[eé]cimo|10[ªºao]?)\s*[.!]?\s*$/iu, valor: 10 },
  { re: /^(?:a|o)?\s*[uú]ltim[oa]\s*[.!]?\s*$/iu, valor: "ultima" },
];

function termoDaEscolha(trecho: string): string {
  return trecho
    .replace(new RegExp(RE_INTERVALO_HORAS.source, "giu"), " ")
    .replace(new RegExp(RE_HORA_PERIODO.source, "giu"), " ")
    .replace(new RegExp(RE_HORA_INICIO.source, "giu"), " ")
    .replace(new RegExp(RE_HORA_SO_AS.source, "giu"), " ")
    .replace(/[?.!,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:o|a|os|as|da|do|de|na|no|em|com)\s+/iu, "")
    .replace(/\s+(?:o|a|os|as|da|do|de|na|no|em|com)$/iu, "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

/**
 * Resposta à lista “Qual você quer cancelar/alterar?”: posição, data, hora ou trecho do título.
 */
export function interpretarEscolhaLista(
  mensagem: string,
  agora: DateTime,
): FiltrosEscolha {
  void agora;
  const texto = mensagem.trim().toLowerCase().normalize("NFC");
  if (!texto) return { termo: "" };

  for (const { re, valor } of ORDINAIS_ESCOLHA) {
    if (re.test(texto)) {
      return valor === "ultima" ? { ultima: true, termo: "" } : { posicao: valor, termo: "" };
    }
  }

  const soNumero = /^(?:a|o)?\s*([1-9])\s*[.!]?\s*$/u.exec(texto);
  if (soNumero) {
    return { posicao: Number(soNumero[1]), termo: "" };
  }

  let resto = texto.replace(RE_CANCELAR, "").replace(RE_ALTERAR, "").trim();
  resto = resto.replace(RE_PREFIXO_ESCOLHA, "").trim();

  const { dia, semDia } = extrairDiaRecorteDoTexto(resto);
  const hora = extrairHoraInicio(semDia);
  const termoBruto = termoDaEscolha(semDia);
  const termo = !termoBruto || RE_DEITICO.test(termoBruto) ? "" : termoBruto;
  return {
    ...(dia ? { dia } : {}),
    ...(hora ? { hora } : {}),
    termo,
  };
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
    if (!sufixo) {
      const { dia, semDia } = extrairDiaRecorteDoTexto(termoBruto);
      const termo = termoDeAlteracao(semDia);
      return dia
        ? { tipo: "alterar_sem_destino", termo, dia }
        : { tipo: "alterar_sem_destino", termo };
    }
    termoBruto = semVerbo.slice(0, sufixo.index);
    destinoBruto = sufixo[1];
  }

  const { dia, semDia } = extrairDiaRecorteDoTexto(termoBruto);
  const termo = termoDeAlteracao(semDia);
  const destino = interpretarDestinoAlteracao(destinoBruto, agora);
  if (!termo || !destino) return { tipo: "desconhecida" };
  return dia
    ? { tipo: "alterar", termo, destino, dia }
    : { tipo: "alterar", termo, destino };
}

function horariosNoDia(
  dia: string,
  texto: string,
): { inicio: string; fim: string } | null {
  const base = DateTime.fromISO(dia, { zone: FUSO_DONO });
  if (!base.isValid) return null;

  const intervalo = RE_INTERVALO_HORAS.exec(texto);
  let inicio: DateTime;
  let fim: DateTime;

  if (intervalo) {
    const começo = horaMinuto(intervalo[1], intervalo[2], intervalo[3]);
    const termino = horaMinuto(intervalo[4], intervalo[5], intervalo[6]);
    if (!começo || !termino) return null;
    inicio = base.set(começo);
    fim = base.set(termino);
    if (fim <= inicio) fim = fim.plus({ days: 1 });
  } else {
    const começo = extrairHoraInicio(texto);
    if (!começo) return null;
    inicio = base.set(começo);
    const minutos = duracaoEmMinutos(texto) ?? 60;
    fim = inicio.plus({ minutes: minutos });
  }

  return { inicio: inicio.toISO()!, fim: fim.toISO()! };
}

function montarPontual(mensagem: string, texto: string, agora: DateTime): Intencao {
  const dia = diaDoPontual(texto, agora);
  if (!dia) return { tipo: "desconhecida" };
  const horarios = horariosNoDia(dia, texto);
  if (!horarios) return { tipo: "desconhecida" };

  return {
    tipo: "marcar_pontual",
    titulo: tituloDaMensagem(mensagem),
    inicio: horarios.inicio,
    fim: horarios.fim,
  };
}

/**
 * Completa uma Marcação pendente de horário: título conhecido + dia + Mensagem
 * com hora (ex.: "às 15h" ou "20 de dezembro às 15h").
 */
export function completarMarcacaoPontual(
  titulo: string,
  diaBase: string | undefined,
  mensagem: string,
  agora: DateTime,
): IntencaoMarcarPontual | IntencaoMarcarPontualSemHora | IntencaoDesconhecida {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");
  const dia = diaExplicitoNaMensagem(texto, agora) ?? diaBase;
  if (!dia) return { tipo: "desconhecida" };

  if (!mensagemTemHora(texto)) {
    return {
      tipo: "marcar_pontual_sem_hora",
      titulo: titulo.trim() || "Compromisso",
      dia,
    };
  }

  const horarios = horariosNoDia(dia, texto);
  if (!horarios) return { tipo: "desconhecida" };

  return {
    tipo: "marcar_pontual",
    titulo: titulo.trim() || "Compromisso",
    inicio: horarios.inicio,
    fim: horarios.fim,
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

  const pedidoDeMarcacao = ehPedidoDeMarcacao(texto);
  const recorteIntervalo = extrairIntervalo(texto, agora);
  if (pedidoDeMarcacao && recorteIntervalo?.tipo === "consulta_intervalo") {
    return {
      tipo: "marcar_periodo",
      titulo: tituloDaViagem(mensagem.trim()),
      primeiroDia: recorteIntervalo.primeiroDia,
      ultimoDia: recorteIntervalo.ultimoDia,
    };
  }

  if (recorteIntervalo) {
    return recorteIntervalo;
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

  if (pedidoDeMarcacao && mensagemFalaDeViagem(texto)) {
    const dia = diaExplicitoNaMensagem(texto, agora) ?? undefined;
    return {
      tipo: "marcar_periodo_sem_duracao",
      titulo: tituloDaViagem(mensagem.trim()),
      ...(dia ? { dia } : {}),
    };
  }

  if (pedidoDeMarcacao) {
    const dia = diaExplicitoNaMensagem(texto, agora);
    if (dia) {
      return {
        tipo: "marcar_pontual_sem_hora",
        titulo: tituloDaMensagem(mensagem.trim()),
        dia,
      };
    }
    return {
      tipo: "marcar_incompleta",
      titulo: tituloDaMensagem(mensagem.trim()),
    };
  }

  const consultaDia = interpretarConsultaDia(texto, agora);
  if (consultaDia) {
    return consultaDia;
  }

  return { tipo: "desconhecida" };
}
