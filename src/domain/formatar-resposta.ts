import type { Compromisso } from "./compromisso";
import type {
  ConfirmacaoAlterarPeriodo,
  ConfirmacaoAlterarPontual,
  ConfirmacaoAlterarTitulo,
  ConfirmacaoCancelarPeriodo,
  ConfirmacaoCancelarPontual,
  ConfirmacaoMarcacao,
  ConfirmacaoPeriodo,
  ConfirmacaoPontual,
} from "./confirmacao";
import {
  FUSO_DONO,
  agoraEmBrasilia,
  diaCivil,
  diaCivilJaPassou,
  formatarDiaPorExtenso,
  formatarHora,
  inicioDoDia,
  NOMES_MESES_PT,
} from "./fuso";
import { DateTime } from "luxon";

export const RESPOSTA_NAO_ENTENDI =
  "Não entendi o pedido. Pode reformular?";

export const RESPOSTA_TIPO_NAO_RECONHECIDO =
  "Posso mostrar viagens, reuniões ou buscar por um termo. Ex.: 'Mostrar reuniões' ou 'eventos com dentista'.";

export const RESPOSTA_TERMO_BUSCA =
  "Com o quê? Ex.: 'eventos com dentista'.";

export const RESPOSTA_O_QUE_MUDAR = "O que mudar?";

export const RESPOSTA_DEIXO_PRA_LA = "Ok, deixo pra lá.";

export const RESPOSTA_ALTERACAO_DOS_EXTREMOS =
  "Para soltar um dia de um Período, isso é Alteração dos extremos, não Cancelamento. Nada foi removido.";

export const RESPOSTA_HORARIO_FIM_INVALIDO =
  "O horário de fim precisa ser depois do início. Diga de novo, por exemplo “das 10h às 12h”.";

function rotuloDia(dia: string, agora?: DateTime): string {
  return formatarDiaPorExtenso(
    dia,
    agora ? { agoraReferencia: agora } : undefined,
  );
}

function formatarCompromisso(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo} (dia inteiro)`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia)} a ${formatarDiaPorExtenso(compromisso.ultimoDia)}`;
}

function detalhePontual(
  titulo: string,
  inicio: string,
  fim: string,
  agora?: DateTime,
): string {
  const dia = diaCivil(DateTime.fromISO(inicio, { setZone: true }));
  return `${titulo}, ${rotuloDia(dia, agora)}, das ${formatarHora(inicio)} às ${formatarHora(fim)}`;
}

function detalhePeriodo(proposta: ConfirmacaoPeriodo, agora?: DateTime): string {
  if (proposta.primeiroDia === proposta.ultimoDia) {
    return `${proposta.titulo}, ${rotuloDia(proposta.primeiroDia, agora)}, dia inteiro`;
  }
  return `${proposta.titulo}, de ${rotuloDia(proposta.primeiroDia, agora)} a ${rotuloDia(proposta.ultimoDia, agora)}, dia inteiro`;
}

function detalheProposta(proposta: ConfirmacaoMarcacao, agora?: DateTime): string {
  if (proposta.acao === "marcar_pontual") {
    return detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora);
  }
  return detalhePeriodo(proposta, agora);
}

export function formatarConfirmacao(
  proposta: ConfirmacaoMarcacao,
  conflitos: Compromisso[] = [],
  agora?: DateTime,
): string {
  const base = `Confirmação: ${detalheProposta(proposta, agora)}.`;
  if (conflitos.length === 0) {
    return `${base} Diga sim para marcar.`;
  }
  const avisos = conflitos
    .map((c) => formatarCompromissoNoIntervalo(c))
    .join("; ");
  return `${base}\n\nALERTA DE CONFLITO: ${avisos}.\nDiga sim para marcar mesmo assim.`;
}

export function formatarConfirmacaoPontual(
  proposta: ConfirmacaoPontual,
  agora?: DateTime,
): string {
  return formatarConfirmacao(proposta, [], agora);
}

export function formatarConfirmacaoPeriodo(
  proposta: ConfirmacaoPeriodo,
  agora?: DateTime,
): string {
  return formatarConfirmacao(proposta, [], agora);
}

export function formatarPontualMarcado(
  proposta: ConfirmacaoPontual,
  agora?: DateTime,
): string {
  return `Marquei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora)}. Compromisso gravado.`;
}

export function formatarPeriodoMarcado(
  proposta: ConfirmacaoPeriodo,
  agora?: DateTime,
): string {
  return `Marquei ${detalhePeriodo(proposta, agora)}. Compromisso gravado.`;
}

export function formatarPedirHorarioMarcacao(
  titulo: string,
  dia: string,
  agora?: DateTime,
): string {
  return `Para marcar ${titulo} em ${rotuloDia(dia, agora)}, diga o horário — por exemplo “às 15h”.`;
}

export function formatarPedirDiaEHorarioMarcacao(titulo: string): string {
  return `Para marcar ${titulo}, diga o dia e o horário — por exemplo “20 de dezembro às 15h”.`;
}

export function formatarPedirDuracaoPeriodo(
  titulo: string,
  dia?: string,
  agora?: DateTime,
): string {
  if (dia) {
    return `${titulo} em ${rotuloDia(dia, agora)}: é de 1 dia ou de mais dias?`;
  }
  return `${titulo}: é de 1 dia ou de mais dias?`;
}

export function formatarPedirDiasPeriodo(titulo: string): string {
  return `Quais dias de ${titulo}? Diga o intervalo — por exemplo “7/11 a 10/11” — ou escolha no calendário.`;
}

export function formatarPedirDestinoAlteracao(titulo: string): string {
  return `Para alterar “${titulo}”, diga o novo dia, horário ou intervalo — por exemplo “para o dia 30” ou “para os dias 29 a 31 de novembro”.`;
}

export function formatarPedirNovoNome(titulo: string): string {
  return `Para mudar o nome de “${titulo}”, diga o novo nome — por exemplo “para Viagem para Itacaré”.`;
}

export function formatarPedirMesDoAno(ano: number): string {
  return `Qual mês de ${ano} você quer ver? Ex.: 'compromissos de março'.`;
}

export function formatarConfirmacaoAlterarTitulo(
  proposta: ConfirmacaoAlterarTitulo,
): string {
  return `Confirmação: “${proposta.titulo}” passa a se chamar “${proposta.tituloNovo}”. Diga sim para alterar.`;
}

export function formatarTituloAlterado(
  proposta: ConfirmacaoAlterarTitulo,
): string {
  return `Alterei o nome para ${proposta.tituloNovo}.`;
}

function avisoConflitos(conflitos: Compromisso[]): string {
  if (conflitos.length === 0) return "";
  const detalhes = conflitos
    .map((c) => formatarCompromissoNoIntervalo(c))
    .join("; ");
  return `\n\nALERTA DE CONFLITO: ${detalhes}.`;
}

export function formatarConfirmacaoAlterarPontual(
  proposta: ConfirmacaoAlterarPontual,
  conflitos: Compromisso[] = [],
  agora?: DateTime,
): string {
  return `Confirmação: sai ${detalhePontual(proposta.titulo, proposta.inicioAtual, proposta.fimAtual, agora)}; entra ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora)}.${avisoConflitos(conflitos)} Diga sim para alterar.`;
}

export function formatarConfirmacaoAlterarPeriodo(
  proposta: ConfirmacaoAlterarPeriodo,
  conflitos: Compromisso[] = [],
  agora?: DateTime,
): string {
  const sai: ConfirmacaoPeriodo = {
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDiaAtual,
    ultimoDia: proposta.ultimoDiaAtual,
  };
  const entra: ConfirmacaoPeriodo = {
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  };
  return `Confirmação: sai ${detalhePeriodo(sai, agora)}; entra ${detalhePeriodo(entra, agora)}.${avisoConflitos(conflitos)} Diga sim para alterar.`;
}

export function formatarPontualAlterado(
  proposta: ConfirmacaoAlterarPontual,
  agora?: DateTime,
): string {
  return `Alterei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora)}.`;
}

export function formatarPeriodoAlterado(
  proposta: ConfirmacaoAlterarPeriodo,
  agora?: DateTime,
): string {
  return `Alterei ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  }, agora)}.`;
}

export function formatarConfirmacaoCancelarPontual(
  proposta: ConfirmacaoCancelarPontual,
  agora?: DateTime,
): string {
  return `Confirmação: cancelar ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora)}. Diga sim para cancelar.`;
}

export function formatarConfirmacaoCancelarPeriodo(
  proposta: ConfirmacaoCancelarPeriodo,
  agora?: DateTime,
): string {
  return `Confirmação: cancelar ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  }, agora)}. Diga sim para cancelar.`;
}

export function formatarPontualCancelado(
  proposta: ConfirmacaoCancelarPontual,
  agora?: DateTime,
): string {
  return `Cancelei ${detalhePontual(proposta.titulo, proposta.inicio, proposta.fim, agora)}.`;
}

export function formatarPeriodoCancelado(
  proposta: ConfirmacaoCancelarPeriodo,
  agora?: DateTime,
): string {
  return `Cancelei ${detalhePeriodo({
    acao: "marcar_periodo",
    titulo: proposta.titulo,
    primeiroDia: proposta.primeiroDia,
    ultimoDia: proposta.ultimoDia,
  }, agora)}.`;
}

export function formatarNaoEncontrado(termo: string): string {
  return `Não encontrei um Compromisso chamado “${termo}”.`;
}

export function formatarListaCandidatos(
  rotulos: string[],
  acao: "alterar" | "cancelar" = "alterar",
): string {
  const linhas = rotulos.map((r) => `• ${r}`);
  const pergunta =
    acao === "cancelar"
      ? "Qual você quer cancelar?"
      : "Qual você quer alterar?";
  return `Encontrei mais de um Compromisso. ${pergunta}\n${linhas.join("\n")}`;
}

export function rotuloCandidato(
  compromisso: Compromisso,
  agora?: DateTime,
): string {
  return formatarCompromissoNoIntervalo(compromisso, agora);
}

export function formatarConsultaDia(
  dia: string,
  compromissos: Compromisso[],
  agora?: DateTime,
): string {
  const rotulo = formatarDiaPorExtenso(dia, { agoraReferencia: agora });
  const passado = agora ? diaCivilJaPassou(dia, agora) : false;

  if (compromissos.length === 0) {
    if (passado) {
      return `${rotulo} já passou. Nada marcado nesse dia.`;
    }
    return `${rotulo} está livre.`;
  }

  const linhas = compromissos.map((c) => `• ${formatarCompromisso(c)}`);
  return `Em ${rotulo}:\n${linhas.join("\n")}`;
}

function instanteDeOrdenacao(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return compromisso.inicio;
  }
  return inicioDoDia(compromisso.primeiroDia).toISO()!;
}

function formatarCompromissoNoIntervalo(
  compromisso: Compromisso,
  agora?: DateTime,
): string {
  const opcoes = agora ? { agoraReferencia: agora, incluirAno: false as const } : undefined;
  if (compromisso.tipo === "pontual") {
    const dia = diaCivil(
      DateTime.fromISO(compromisso.inicio, { setZone: true }),
    );
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}, ${formatarDiaPorExtenso(dia, opcoes)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo}, ${formatarDiaPorExtenso(compromisso.primeiroDia, opcoes)}`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia, opcoes)} a ${formatarDiaPorExtenso(compromisso.ultimoDia, opcoes)}`;
}

function rotuloIntervalo(primeiroDia: string, ultimoDia: string): string {
  if (primeiroDia === ultimoDia) {
    return formatarDiaPorExtenso(primeiroDia);
  }
  const a = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
  const b = DateTime.fromISO(ultimoDia, { zone: FUSO_DONO });
  if (a.month === b.month && a.year === b.year) {
    return `De ${a.day} a ${b.day} de ${NOMES_MESES_PT[a.month]}`;
  }
  return `De ${formatarDiaPorExtenso(primeiroDia)} a ${formatarDiaPorExtenso(ultimoDia)}`;
}

export function formatarConsultaIntervalo(
  primeiroDia: string,
  ultimoDia: string,
  compromissos: Compromisso[],
  agora?: DateTime,
): string {
  if (primeiroDia === ultimoDia) {
    return formatarConsultaDia(primeiroDia, compromissos, agora);
  }

  const rotulo = rotuloIntervalo(primeiroDia, ultimoDia);
  const passado =
    agora &&
    DateTime.fromISO(ultimoDia, { zone: FUSO_DONO }).endOf("day") <
      agoraEmBrasilia(agora).startOf("day");
  if (compromissos.length === 0) {
    if (passado) {
      return `${rotulo} já passou. Nada marcado nesse recorte.`;
    }
    return `${rotulo} está livre.`;
  }

  const linhas = [...compromissos]
    .sort((a, b) => instanteDeOrdenacao(a).localeCompare(instanteDeOrdenacao(b)))
    .map((c) => `• ${formatarCompromissoNoIntervalo(c, agora)}`);
  return `${rotulo}:\n${linhas.join("\n")}`;
}

export function escaparTermoExibicao(termo: string): string {
  return termo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cabecalhoListagemTodos(rotuloPeriodo?: string): string {
  if (!rotuloPeriodo) return "Compromissos futuros:";
  return `Compromissos ${rotuloPeriodo}:`;
}

export function mensagemVaziaTodos(rotuloPeriodo?: string): string {
  if (!rotuloPeriodo) return "Nenhum compromisso futuro.";
  return `Nenhum compromisso ${rotuloPeriodo}.`;
}

export function cabecalhoListagemTipo(
  filtro: "viagens" | "reunioes",
  rotuloPeriodo?: string,
): string {
  const nome = filtro === "viagens" ? "Viagens" : "Reuniões";
  if (!rotuloPeriodo) return `${nome} futuras:`;
  return `${nome} ${rotuloPeriodo}:`;
}

export function mensagemVaziaTipo(
  filtro: "viagens" | "reunioes",
  rotuloPeriodo?: string,
): string {
  const nome = filtro === "viagens" ? "viagem" : "reunião";
  if (!rotuloPeriodo) return `Nenhuma ${nome} futura.`;
  return `Nenhuma ${nome} ${rotuloPeriodo}.`;
}

export function cabecalhoListagemBusca(
  termo: string,
  rotuloPeriodo?: string,
): string {
  const quoted = `"${escaparTermoExibicao(termo)}"`;
  if (!rotuloPeriodo) return `Eventos com ${quoted}:`;
  return `Eventos com ${quoted} ${rotuloPeriodo}:`;
}

export function mensagemVaziaBusca(
  termo: string,
  rotuloPeriodo?: string,
): string {
  const quoted = `"${escaparTermoExibicao(termo)}"`;
  if (!rotuloPeriodo) {
    return `Nenhum evento com ${quoted} nos próximos 12 meses.`;
  }
  return `Nenhum evento com ${quoted} ${rotuloPeriodo}.`;
}

export function formatarListagemFiltrada(
  compromissos: Compromisso[],
  agora: DateTime,
  opcoes: {
    cabecalho: string;
    vazia: string;
    offset: number;
    itensPorPagina: number;
    truncadoAte?: string;
  },
): { texto: string; proximoOffset: number | null; itens: Compromisso[] } {
  const ordenados = [...compromissos].sort((a, b) =>
    instanteDeOrdenacao(a).localeCompare(instanteDeOrdenacao(b)),
  );
  const fatia = ordenados.slice(
    opcoes.offset,
    opcoes.offset + opcoes.itensPorPagina,
  );
  const resto = Math.max(0, ordenados.length - opcoes.offset - fatia.length);

  const avisoTeto = opcoes.truncadoAte
    ? `\n\nMostrei até ${formatarDiaPorExtenso(opcoes.truncadoAte, { agoraReferencia: agora })}. Peça um período para ver depois disso.`
    : "";

  if (ordenados.length === 0 || fatia.length === 0) {
    return {
      texto: `${opcoes.vazia}${avisoTeto}`,
      proximoOffset: null,
      itens: [],
    };
  }

  const linhas = fatia.map((c) => `• ${formatarCompromissoNoIntervalo(c, agora)}`);
  let texto = `${opcoes.cabecalho}\n${linhas.join("\n")}`;
  if (resto > 0) {
    texto += `\n\ne mais ${resto}. Diga 'mostrar mais' ou peça um período.`;
  }
  texto += avisoTeto;
  return {
    texto,
    proximoOffset: resto > 0 ? opcoes.offset + fatia.length : null,
    itens: fatia,
  };
}
