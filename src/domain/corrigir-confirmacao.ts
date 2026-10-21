import type {
  ConfirmacaoPendente,
  ConfirmacaoPeriodo,
  ConfirmacaoPontual,
} from "./confirmacao";
import { FUSO_DONO, MESES_PT, resolverAnoDaData } from "./fuso";
import { DateTime } from "luxon";

const GRUPO_MES =
  "janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

const PALAVRA = String.raw`(?<![\p{L}\p{N}])`;
const FIM_PALAVRA = String.raw`(?![\p{L}\p{N}])`;
const HORA = String.raw`(\d{1,2})(?:h(\d{2})?|:(\d{2}))`;

const RE_RECUSA_PURA = /^(?:n[aã]o)\s*[.!]?\s*$/iu;
const RE_RECUSA_PREFIXO = /^(?:n[aã]o)\s*[,.]?\s*/iu;

const RE_DATA = new RegExp(
  String.raw`(?:^|\b)(?:dia\s+)?(\d{1,2})\s+de\s+(${GRUPO_MES})\b`,
  "iu",
);

const RE_DIA_SOLTO = new RegExp(
  `${PALAVRA}(?:dia\\s+)?(\\d{1,2})${FIM_PALAVRA}`,
  "iu",
);

const RE_INTERVALO_HORAS = new RegExp(
  `${PALAVRA}das?\\s+${HORA}\\s+[aà]s\\s+${HORA}${FIM_PALAVRA}`,
  "iu",
);

const RE_HORA_INICIO = new RegExp(
  `${PALAVRA}(?:[aà]s\\s+)?${HORA}${FIM_PALAVRA}`,
  "iu",
);

const RE_DURACAO =
  /\bpor\s+(?:(meia)\s+hora|(uma)\s+hora|(\d+)\s*(minutos?|min|horas?))\b/iu;

export function ehRecusaPura(mensagem: string): boolean {
  return RE_RECUSA_PURA.test(mensagem.trim());
}

export function temPrefixoDeRecusa(mensagem: string): boolean {
  return RE_RECUSA_PREFIXO.test(mensagem.trim());
}

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

function diaDaCorrecao(
  texto: string,
  agora: DateTime,
  diaBase: string,
): string | null {
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
  const comMes = RE_DATA.exec(texto);
  if (comMes) {
    const dia = Number(comMes[1]);
    const mes = mesDe(comMes[2]);
    if (!mes || dia < 1 || dia > 31) return null;
    try {
      return resolverAnoDaData(dia, mes, agora);
    } catch {
      return null;
    }
  }
  const solto = RE_DIA_SOLTO.exec(texto);
  if (solto) {
    const dia = Number(solto[1]);
    if (dia < 1 || dia > 31) return null;
    const ancora = DateTime.fromISO(diaBase, { zone: FUSO_DONO });
    const candidato = DateTime.fromObject(
      { year: ancora.year, month: ancora.month, day: dia },
      { zone: FUSO_DONO },
    );
    if (!candidato.isValid) return null;
    return candidato.toISODate();
  }
  return null;
}

function tituloDaCorrecao(mensagem: string): string | undefined {
  let titulo = mensagem.normalize("NFC").trim();
  titulo = titulo.replace(RE_RECUSA_PREFIXO, "");
  titulo = titulo.replace(/^\s*(?:é|eh)\s+/iu, "");
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
      `${PALAVRA}(?:no\\s+)?dia\\s+\\d{1,2}(?:\\s+de\\s+(?:${GRUPO_MES}))?${FIM_PALAVRA}`,
      "giu",
    ),
    " ",
  );
  titulo = titulo.replace(
    new RegExp(
      `${PALAVRA}\\d{1,2}\\s+de\\s+(?:${GRUPO_MES})${FIM_PALAVRA}`,
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
  if (!titulo) return undefined;
  return titulo.charAt(0).toLocaleUpperCase("pt-BR") + titulo.slice(1);
}

function aplicarPontual(
  pendente: ConfirmacaoPontual,
  mensagem: string,
  agora: DateTime,
): ConfirmacaoPontual | null {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");
  const diaAtual = DateTime.fromISO(pendente.inicio, { setZone: true })
    .setZone(FUSO_DONO)
    .toISODate()!;
  const dia = diaDaCorrecao(texto, agora, diaAtual);
  const intervalo = RE_INTERVALO_HORAS.exec(texto);
  const duracao = duracaoEmMinutos(texto);
  let horaInicio: { hour: number; minute: number } | null = null;
  let horaFim: { hour: number; minute: number } | null = null;
  if (intervalo) {
    horaInicio = horaMinuto(intervalo[1], intervalo[2], intervalo[3]);
    horaFim = horaMinuto(intervalo[4], intervalo[5], intervalo[6]);
  } else {
    const hora = RE_HORA_INICIO.exec(texto);
    if (hora) {
      horaInicio = horaMinuto(hora[1], hora[2], hora[3]);
    }
  }
  const titulo = tituloDaCorrecao(mensagem);

  if (!dia && !horaInicio && !horaFim && duracao == null && !titulo) {
    return null;
  }

  let inicio = DateTime.fromISO(pendente.inicio, { setZone: true }).setZone(
    FUSO_DONO,
  );
  let fim = DateTime.fromISO(pendente.fim, { setZone: true }).setZone(FUSO_DONO);
  const duracaoOriginal = fim.diff(inicio);

  if (dia) {
    const novoDia = DateTime.fromISO(dia, { zone: FUSO_DONO });
    inicio = novoDia.set({
      hour: inicio.hour,
      minute: inicio.minute,
      second: 0,
      millisecond: 0,
    });
    fim = inicio.plus(duracaoOriginal);
  }

  if (horaInicio) {
    inicio = inicio.set(horaInicio);
    if (horaFim) {
      fim = inicio.set(horaFim);
      if (fim <= inicio) fim = fim.plus({ days: 1 });
    } else if (duracao != null) {
      fim = inicio.plus({ minutes: duracao });
    } else {
      fim = inicio.plus(duracaoOriginal);
    }
  } else if (duracao != null) {
    fim = inicio.plus({ minutes: duracao });
  }

  return {
    acao: "marcar_pontual",
    titulo: titulo ?? pendente.titulo,
    inicio: inicio.toISO()!,
    fim: fim.toISO()!,
  };
}

function aplicarPeriodo(
  pendente: ConfirmacaoPeriodo,
  mensagem: string,
  agora: DateTime,
): ConfirmacaoPeriodo | null {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");
  const dia = diaDaCorrecao(texto, agora, pendente.primeiroDia);
  const titulo = tituloDaCorrecao(mensagem);
  if (!dia && !titulo) return null;

  let primeiroDia = pendente.primeiroDia;
  let ultimoDia = pendente.ultimoDia;
  if (dia) {
    const origem = DateTime.fromISO(pendente.primeiroDia, { zone: FUSO_DONO });
    const destino = DateTime.fromISO(dia, { zone: FUSO_DONO });
    const deslocamento = destino.diff(origem, "days").days;
    primeiroDia = destino.toISODate()!;
    ultimoDia = DateTime.fromISO(pendente.ultimoDia, { zone: FUSO_DONO })
      .plus({ days: deslocamento })
      .toISODate()!;
  }

  return {
    acao: "marcar_periodo",
    titulo: titulo ?? pendente.titulo,
    primeiroDia,
    ultimoDia,
  };
}

/**
 * Aplica só o que a Mensagem mudou sobre a Confirmação pendente.
 * Sem campo reconhecido, devolve null — a Conversa pergunta de novo.
 */
export function aplicarCorrecao(
  pendente: ConfirmacaoPendente,
  mensagem: string,
  agora: DateTime,
): ConfirmacaoPendente | null {
  if (pendente.acao === "marcar_pontual") {
    return aplicarPontual(pendente, mensagem, agora);
  }
  return aplicarPeriodo(pendente, mensagem, agora);
}
