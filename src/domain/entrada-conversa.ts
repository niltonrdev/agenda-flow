import {
  aplicarDestino,
  aplicarDestinoNaProposta,
} from "./aplicar-alteracao";
import type { Calendario } from "./calendario";
import {
  compromissosEmConflito,
  intervaloDeListagem,
  janelaDeBusca,
} from "./conflito";
import type { Compromisso, NovoCompromisso } from "./compromisso";
import {
  candidatosDoContexto,
  ehConfirmacaoMarcacao,
  ehConfirmacaoPendente,
  ehContextoListagem,
  ehListagemPaginada,
  TTL_CONTEXTO_MS,
  type ConfirmacaoAlterarPeriodo,
  type ConfirmacaoAlterarPontual,
  type ConfirmacaoCancelarPeriodo,
  type ConfirmacaoCancelarPontual,
  type ConfirmacaoEscolherAlteracao,
  type ConfirmacaoEscolherCancelamento,
  type ConfirmacaoMarcacao,
  type ConfirmacaoPendente,
} from "./confirmacao";
import {
  aplicarCorrecao,
  ehAbortarConfirmacao,
  ehRecusaPura,
  temPrefixoDeRecusa,
} from "./corrigir-confirmacao";
import {
  FalhaDoCalendario,
  RESPOSTA_NAO_GRAVADO,
  type CodigoFalhaCalendario,
} from "./falha-calendario";
import {
  formatarConfirmacao,
  formatarConfirmacaoAlterarPeriodo,
  formatarConfirmacaoAlterarPontual,
  formatarConfirmacaoCancelarPeriodo,
  formatarConfirmacaoCancelarPontual,
  formatarConsultaDia,
  formatarConsultaIntervalo,
  formatarListaCandidatos,
  formatarNaoEncontrado,
  formatarPedirDestinoAlteracao,
  formatarPedirDiaEHorarioMarcacao,
  formatarPedirDiasPeriodo,
  formatarPedirDuracaoPeriodo,
  formatarPedirHorarioMarcacao,
  formatarPeriodoAlterado,
  formatarPeriodoCancelado,
  formatarPeriodoMarcado,
  formatarPontualAlterado,
  formatarPontualCancelado,
  formatarPontualMarcado,
  RESPOSTA_ALTERACAO_DOS_EXTREMOS,
  RESPOSTA_DEIXO_PRA_LA,
  RESPOSTA_NAO_ENTENDI,
  RESPOSTA_O_QUE_MUDAR,
  rotuloCandidato,
} from "./formatar-resposta";
import { FUSO_DONO, diaCivil, fimDoDia, inicioDoDia } from "./fuso";
import {
  completarMarcacaoPontual,
  interpretarDestinoAlteracao,
  interpretarEscolhaLista,
  interpretarMensagem,
  interpretarRespostaDuracao,
  periodoAPartirDaDuracao,
  type DestinoAlteracao,
  type DiaRecorte,
  type Intencao,
} from "./interpretador";
import { processarIntencaoListagem } from "./listagem-filtrada";
import { DateTime } from "luxon";

/**
 * Pedido novo: não tratar como correção da Confirmação pendente.
 * "às 16h" parece Marcação, mas na correção é só o horário — exige verbo marcar.
 */
function ehPedidoNovo(intencao: Intencao, mensagem: string): boolean {
  if (
    intencao.tipo === "alterar" ||
    intencao.tipo === "alterar_sem_destino" ||
    intencao.tipo === "cancelar" ||
    intencao.tipo === "consulta_dia" ||
    intencao.tipo === "consulta_intervalo" ||
    intencao.tipo === "marcar_periodo" ||
    intencao.tipo === "marcar_periodo_sem_duracao"
  ) {
    return true;
  }
  if (
    intencao.tipo === "marcar_pontual" ||
    intencao.tipo === "marcar_pontual_sem_hora"
  ) {
    return /^(?:marcar|marca|marque)\b/iu.test(mensagem.trim());
  }
  return false;
}

export type EntradaConversa = {
  mensagem: string;
  /** Relógio congelado nos testes; nunca ler Date.now() no núcleo. */
  agora: DateTime;
  /**
   * Proposta do turno anterior. O núcleo não a guarda: a rota cifra uma
   * cópia no cookie e ignora o valor enviado pelo cliente.
   */
  confirmacaoPendente?: ConfirmacaoPendente | null;
  /** Último dia de Consulta; serve para "marcar … então". */
  ultimoDiaConsultado?: string | null;
};

export type SaidaConversa = {
  texto: string;
  confirmacaoPendente: ConfirmacaoPendente | null;
  ultimoDiaConsultado?: string | null;
  /** Dia civil (YYYY-MM-DD) para abrir a visão do dia no Calendário. */
  diaParaCalendario?: string | null;
  falha?: CodigoFalhaCalendario | null;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function casaComTermo(titulo: string, termo: string): boolean {
  const termoN = normalizar(termo).trim();
  if (!termoN) return false;
  const tituloN = normalizar(titulo);
  const palavras = termoN
    .split(/\s+/u)
    .filter(
      (p) => p.length > 1 && !["de", "da", "do", "com", "as", "os", "a"].includes(p),
    );
  if (palavras.length === 0) return tituloN.includes(termoN);
  return palavras.every((p) => tituloN.includes(p));
}

function casaComDiaRecorte(
  compromisso: Compromisso,
  recorte: DiaRecorte,
): boolean {
  if (compromisso.tipo === "pontual") {
    const dt = DateTime.fromISO(compromisso.inicio, { setZone: true }).setZone(
      FUSO_DONO,
    );
    if (dt.day !== recorte.dia) return false;
    if (recorte.mes != null && dt.month !== recorte.mes) return false;
    if (recorte.ano != null && dt.year !== recorte.ano) return false;
    return true;
  }
  const primeiro = DateTime.fromISO(compromisso.primeiroDia, {
    zone: FUSO_DONO,
  }).startOf("day");
  const ultimo = DateTime.fromISO(compromisso.ultimoDia, {
    zone: FUSO_DONO,
  }).startOf("day");
  if (recorte.mes == null) {
    return primeiro.day === recorte.dia || ultimo.day === recorte.dia;
  }
  let cursor = primeiro;
  while (cursor <= ultimo) {
    if (
      cursor.day === recorte.dia &&
      cursor.month === recorte.mes &&
      (recorte.ano == null || cursor.year === recorte.ano)
    ) {
      return true;
    }
    cursor = cursor.plus({ days: 1 });
  }
  return false;
}

function filtrarCandidatos(
  existentes: Compromisso[],
  termo: string,
  dia?: DiaRecorte,
): Compromisso[] {
  const porTermo = existentes.filter((c) => casaComTermo(c.titulo, termo));
  if (!dia) return porTermo;
  return porTermo.filter((c) => casaComDiaRecorte(c, dia));
}

function instanteDe(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") return compromisso.inicio;
  return inicioDoDia(compromisso.primeiroDia).toISO()!;
}

function ordenarCompromissos(itens: Compromisso[]): Compromisso[] {
  return [...itens].sort((a, b) => instanteDe(a).localeCompare(instanteDe(b)));
}

function candidatosDe(
  compromissos: Compromisso[],
  agora: DateTime,
): ConfirmacaoEscolherAlteracao["candidatos"] {
  return ordenarCompromissos(compromissos).map((c) => ({
    id: c.id,
    rotulo: rotuloCandidato(c, agora),
  }));
}

function emIso(agora: DateTime): string {
  return agora.toISO()!;
}

function pendenteExpirado(
  pendente: ConfirmacaoPendente,
  agora: DateTime,
): boolean {
  if (
    pendente.acao !== "contexto_listagem" &&
    pendente.acao !== "listagem_paginada" &&
    pendente.acao !== "escolher_cancelamento" &&
    pendente.acao !== "escolher_alteracao"
  ) {
    return false;
  }
  const em = "em" in pendente ? pendente.em : undefined;
  if (!em) return false;
  const inicio = DateTime.fromISO(em, { setZone: true });
  if (!inicio.isValid) return true;
  return agora.toMillis() - inicio.toMillis() > TTL_CONTEXTO_MS;
}

function casaComHora(
  compromisso: Compromisso,
  hora: { hour: number; minute: number },
): boolean {
  if (compromisso.tipo !== "pontual") return false;
  const dt = DateTime.fromISO(compromisso.inicio, { setZone: true }).setZone(
    FUSO_DONO,
  );
  return dt.hour === hora.hour && dt.minute === hora.minute;
}

type ParCandidato = {
  id: string;
  rotulo: string;
  compromisso?: Compromisso;
};

async function paresDosCandidatos(
  candidatos: ConfirmacaoEscolherAlteracao["candidatos"],
  calendario: Calendario,
  agora: DateTime,
): Promise<ParCandidato[]> {
  const todos = await calendario.listar(janelaDeBusca(agora));
  return candidatos.map((c) => ({
    ...c,
    compromisso: todos.find((t) => t.id === c.id),
  }));
}

function casarEscolha(
  mensagem: string,
  pares: ParCandidato[],
  agora: DateTime,
): ParCandidato[] {
  if (pares.length === 0) return [];
  const filtros = interpretarEscolhaLista(mensagem, agora);

  if (filtros.ultima) {
    return pares.slice(-1);
  }
  if (filtros.posicao != null) {
    const indice = filtros.posicao - 1;
    if (indice >= 0 && indice < pares.length) {
      return [pares[indice]];
    }
  }

  let restantes = pares;
  if (filtros.dia) {
    restantes = restantes.filter(
      (p) => p.compromisso != null && casaComDiaRecorte(p.compromisso, filtros.dia!),
    );
  }
  if (filtros.hora) {
    restantes = restantes.filter(
      (p) => p.compromisso != null && casaComHora(p.compromisso, filtros.hora!),
    );
  }
  if (filtros.termo) {
    restantes = restantes.filter((p) => {
      if (p.compromisso && casaComTermo(p.compromisso.titulo, filtros.termo)) {
        return true;
      }
      return normalizar(p.rotulo).includes(normalizar(filtros.termo));
    });
  }
  if ((filtros.dia || filtros.hora || filtros.termo) && restantes.length > 0) {
    return restantes;
  }

  const bruto = normalizar(mensagem).replace(
    /^(?:a|o|essa|esse|este|quero)\s+(?:de\s+)?/u,
    "",
  );
  if (!bruto) return [];
  return pares.filter((c) => normalizar(c.rotulo).includes(bruto));
}

function ehMutacaoCurta(intencao: Intencao): boolean {
  if (intencao.tipo === "cancelar") {
    return !intencao.termo && intencao.dia == null;
  }
  if (intencao.tipo === "alterar_sem_destino") {
    return !intencao.termo && intencao.dia == null;
  }
  return false;
}

function relistarCandidatos(
  pares: ParCandidato[],
  acao: "cancelar" | "alterar",
  agora: DateTime,
  destino?: DestinoAlteracao,
): SaidaConversa {
  const lista = pares.map((p) => ({ id: p.id, rotulo: p.rotulo }));
  if (acao === "cancelar") {
    const proposta: ConfirmacaoEscolherCancelamento = {
      acao: "escolher_cancelamento",
      candidatos: lista,
      em: emIso(agora),
    };
    return {
      texto: formatarListaCandidatos(
        lista.map((c) => c.rotulo),
        "cancelar",
      ),
      confirmacaoPendente: proposta,
    };
  }
  const proposta: ConfirmacaoEscolherAlteracao = {
    acao: "escolher_alteracao",
    candidatos: lista,
    em: emIso(agora),
    ...(destino ? { destino } : {}),
  };
  return {
    texto: formatarListaCandidatos(lista.map((c) => c.rotulo)),
    confirmacaoPendente: proposta,
  };
}

function ehAlteracao(
  pendente: ConfirmacaoPendente,
): pendente is ConfirmacaoAlterarPontual | ConfirmacaoAlterarPeriodo {
  return pendente.acao === "alterar_pontual" || pendente.acao === "alterar_periodo";
}

function ehEscolha(
  pendente: ConfirmacaoPendente,
): pendente is ConfirmacaoEscolherAlteracao | ConfirmacaoEscolherCancelamento {
  return (
    pendente.acao === "escolher_alteracao" ||
    pendente.acao === "escolher_cancelamento"
  );
}

function ehCompletarMarcacao(
  pendente: ConfirmacaoPendente,
): pendente is Extract<ConfirmacaoPendente, { acao: "completar_marcacao" }> {
  return pendente.acao === "completar_marcacao";
}

function ehCompletarAlteracao(
  pendente: ConfirmacaoPendente,
): pendente is Extract<ConfirmacaoPendente, { acao: "completar_alteracao" }> {
  return pendente.acao === "completar_alteracao";
}

function ehCompletarDuracaoPeriodo(
  pendente: ConfirmacaoPendente,
): pendente is Extract<ConfirmacaoPendente, { acao: "completar_duracao_periodo" }> {
  return pendente.acao === "completar_duracao_periodo";
}

function ehCompletarDiasPeriodo(
  pendente: ConfirmacaoPendente,
): pendente is Extract<ConfirmacaoPendente, { acao: "completar_dias_periodo" }> {
  return pendente.acao === "completar_dias_periodo";
}

type ConfirmacaoCorrigivel = Extract<
  ConfirmacaoPendente,
  { aguardandoCorrecao?: boolean }
>;

function ehConfirmacaoCorrigivel(
  pendente: ConfirmacaoPendente,
): pendente is ConfirmacaoCorrigivel {
  return (
    pendente.acao === "marcar_pontual" ||
    pendente.acao === "marcar_periodo" ||
    pendente.acao === "alterar_pontual" ||
    pendente.acao === "alterar_periodo" ||
    pendente.acao === "cancelar_pontual" ||
    pendente.acao === "cancelar_periodo"
  );
}

function comDiaConsultado(
  saida: Omit<SaidaConversa, "ultimoDiaConsultado"> & {
    ultimoDiaConsultado?: string | null;
  },
  diaAnterior: string | null,
): SaidaConversa {
  return {
    ...saida,
    ultimoDiaConsultado:
      saida.ultimoDiaConsultado !== undefined
        ? saida.ultimoDiaConsultado
        : diaAnterior,
  };
}

function pedirDuracaoPeriodo(
  titulo: string,
  dia: string | undefined,
  diaAnterior: string | null,
): SaidaConversa {
  return comDiaConsultado(
    {
      texto: formatarPedirDuracaoPeriodo(titulo, dia),
      confirmacaoPendente: {
        acao: "completar_duracao_periodo",
        titulo,
        ...(dia ? { dia } : {}),
      },
    },
    diaAnterior,
  );
}

function pedirDiasPeriodo(
  titulo: string,
  dia: string | undefined,
  diaAnterior: string | null,
): SaidaConversa {
  return comDiaConsultado(
    {
      texto: formatarPedirDiasPeriodo(titulo),
      confirmacaoPendente: {
        acao: "completar_dias_periodo",
        titulo,
        ...(dia ? { dia } : {}),
      },
    },
    diaAnterior,
  );
}

function pedirHorarioMarcacao(
  titulo: string,
  dia: string,
  diaAnterior: string | null,
): SaidaConversa {
  return comDiaConsultado(
    {
      texto: formatarPedirHorarioMarcacao(titulo, dia),
      confirmacaoPendente: {
        acao: "completar_marcacao",
        titulo,
        dia,
      },
    },
    diaAnterior,
  );
}

function confirmacaoDeCancelamento(compromisso: Compromisso): SaidaConversa {
  if (compromisso.tipo === "pontual") {
    const proposta: ConfirmacaoCancelarPontual = {
      acao: "cancelar_pontual",
      id: compromisso.id,
      titulo: compromisso.titulo,
      inicio: compromisso.inicio,
      fim: compromisso.fim,
    };
    return {
      texto: formatarConfirmacaoCancelarPontual(proposta),
      confirmacaoPendente: proposta,
    };
  }
  const proposta: ConfirmacaoCancelarPeriodo = {
    acao: "cancelar_periodo",
    id: compromisso.id,
    titulo: compromisso.titulo,
    primeiroDia: compromisso.primeiroDia,
    ultimoDia: compromisso.ultimoDia,
  };
  return {
    texto: formatarConfirmacaoCancelarPeriodo(proposta),
    confirmacaoPendente: proposta,
  };
}

async function conflitosDaProposta(
  calendario: Calendario,
  proposto: NovoCompromisso,
  ignorarId?: string,
): Promise<Compromisso[]> {
  const proposta =
    proposto.tipo === "pontual"
      ? { tipo: "pontual" as const, inicio: proposto.inicio, fim: proposto.fim }
      : {
          tipo: "periodo" as const,
          primeiroDia: proposto.primeiroDia,
          ultimoDia: proposto.ultimoDia,
        };
  const existentes = await calendario.listar(intervaloDeListagem(proposta));
  return compromissosEmConflito(proposta, existentes, ignorarId);
}

async function saidaDeConfirmacao(
  proposta: ConfirmacaoMarcacao,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const janela =
    proposta.acao === "marcar_pontual"
      ? { inicio: proposta.inicio, fim: proposta.fim }
      : {
          inicio: inicioDoDia(proposta.primeiroDia).toISO()!,
          fim: fimDoDia(proposta.ultimoDia).toISO()!,
        };
  const existentes = await calendario.listar(janela);
  const conflitos = compromissosEmConflito(
    proposta.acao === "marcar_pontual"
      ? { tipo: "pontual", inicio: proposta.inicio, fim: proposta.fim }
      : {
          tipo: "periodo",
          primeiroDia: proposta.primeiroDia,
          ultimoDia: proposta.ultimoDia,
        },
    existentes,
  );
  return {
    texto: formatarConfirmacao(proposta, conflitos),
    confirmacaoPendente: proposta,
  };
}

async function confirmarAlteracao(
  compromisso: Compromisso,
  proposto: NovoCompromisso,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const conflitos = await conflitosDaProposta(
    calendario,
    proposto,
    compromisso.id,
  );
  if (compromisso.tipo === "pontual" && proposto.tipo === "pontual") {
    const proposta: ConfirmacaoAlterarPontual = {
      acao: "alterar_pontual",
      id: compromisso.id,
      titulo: compromisso.titulo,
      inicioAtual: compromisso.inicio,
      fimAtual: compromisso.fim,
      inicio: proposto.inicio,
      fim: proposto.fim,
    };
    return {
      texto: formatarConfirmacaoAlterarPontual(proposta, conflitos),
      confirmacaoPendente: proposta,
    };
  }
  if (proposto.tipo === "periodo") {
    const diaAtual =
      compromisso.tipo === "periodo"
        ? {
            primeiroDiaAtual: compromisso.primeiroDia,
            ultimoDiaAtual: compromisso.ultimoDia,
          }
        : {
            primeiroDiaAtual: DateTime.fromISO(compromisso.inicio, {
              setZone: true,
            })
              .setZone(FUSO_DONO)
              .toISODate()!,
            ultimoDiaAtual: DateTime.fromISO(compromisso.inicio, {
              setZone: true,
            })
              .setZone(FUSO_DONO)
              .toISODate()!,
          };
    const proposta: ConfirmacaoAlterarPeriodo = {
      acao: "alterar_periodo",
      id: compromisso.id,
      titulo: compromisso.titulo,
      ...diaAtual,
      primeiroDia: proposto.primeiroDia,
      ultimoDia: proposto.ultimoDia,
    };
    return {
      texto: formatarConfirmacaoAlterarPeriodo(proposta, conflitos),
      confirmacaoPendente: proposta,
    };
  }
  return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
}

async function montarAlteracao(
  compromisso: Compromisso,
  destino: DestinoAlteracao,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const proposto = aplicarDestino(compromisso, destino);
  if (!proposto) {
    return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
  }
  return confirmarAlteracao(compromisso, proposto, calendario);
}

async function corrigirAlteracao(
  pendente: ConfirmacaoAlterarPontual | ConfirmacaoAlterarPeriodo,
  destino: DestinoAlteracao,
  calendario: Calendario,
): Promise<SaidaConversa | null> {
  if (pendente.acao === "alterar_pontual") {
    const proposto = aplicarDestinoNaProposta(
      {
        tipo: "pontual",
        titulo: pendente.titulo,
        inicio: pendente.inicio,
        fim: pendente.fim,
      },
      destino,
    );
    if (!proposto || proposto.tipo !== "pontual") return null;
    const atual: Compromisso = {
      id: pendente.id,
      tipo: "pontual",
      titulo: pendente.titulo,
      inicio: pendente.inicioAtual,
      fim: pendente.fimAtual,
    };
    return confirmarAlteracao(atual, proposto, calendario);
  }
  const proposto = aplicarDestinoNaProposta(
    {
      tipo: "periodo",
      titulo: pendente.titulo,
      primeiroDia: pendente.primeiroDia,
      ultimoDia: pendente.ultimoDia,
    },
    destino,
  );
  if (!proposto || proposto.tipo !== "periodo") return null;
  const atual: Compromisso = {
    id: pendente.id,
    tipo: "periodo",
    titulo: pendente.titulo,
    primeiroDia: pendente.primeiroDiaAtual,
    ultimoDia: pendente.ultimoDiaAtual,
  };
  return confirmarAlteracao(atual, proposto, calendario);
}

/**
 * Única entrada de conversa: Mensagem + agora → resposta em PT-BR.
 * A UI não decide domínio; só mostra o texto.
 */
export async function processarTurno(
  entrada: EntradaConversa,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const pendenteInicial = ehConfirmacaoPendente(entrada.confirmacaoPendente)
    ? entrada.confirmacaoPendente
    : null;
  try {
    const saida = await processarTurnoInterno(entrada, calendario);
    return {
      ...saida,
      ultimoDiaConsultado:
        saida.ultimoDiaConsultado !== undefined
          ? saida.ultimoDiaConsultado
          : (entrada.ultimoDiaConsultado ?? null),
      diaParaCalendario: saida.diaParaCalendario ?? null,
    };
  } catch (erro) {
    if (erro instanceof FalhaDoCalendario) {
      return {
        texto: erro.message || RESPOSTA_NAO_GRAVADO,
        confirmacaoPendente: pendenteInicial,
        ultimoDiaConsultado: entrada.ultimoDiaConsultado ?? null,
        diaParaCalendario: null,
        falha: erro.codigo,
      };
    }
    throw erro;
  }
}

async function processarTurnoInterno(
  entrada: EntradaConversa,
  calendario: Calendario,
): Promise<SaidaConversa> {
  const intencao = interpretarMensagem(entrada.mensagem, entrada.agora);
  const pendenteBruto = ehConfirmacaoPendente(entrada.confirmacaoPendente)
    ? entrada.confirmacaoPendente
    : null;
  const pendente =
    pendenteBruto && !pendenteExpirado(pendenteBruto, entrada.agora)
      ? pendenteBruto
      : null;
  const diaAnterior = entrada.ultimoDiaConsultado ?? null;

  if (pendente && ehCompletarAlteracao(pendente)) {
    if (intencao.tipo === "recusar") {
      return comDiaConsultado(
        { texto: "Ok, não altero.", confirmacaoPendente: null },
        diaAnterior,
      );
    }
    if (intencao.tipo === "confirmar") {
      return comDiaConsultado(
        {
          texto: formatarPedirDestinoAlteracao(pendente.titulo),
          confirmacaoPendente: pendente,
        },
        diaAnterior,
      );
    }
    if (
      intencao.tipo !== "alterar" &&
      intencao.tipo !== "alterar_sem_destino" &&
      intencao.tipo !== "cancelar"
    ) {
      const destino = interpretarDestinoAlteracao(
        entrada.mensagem.replace(/^(?:para\s+)/iu, ""),
        entrada.agora,
      );
      if (destino) {
        const todos = await calendario.listar(janelaDeBusca(entrada.agora));
        const compromisso = todos.find((c) => c.id === pendente.id);
        if (!compromisso) {
          return comDiaConsultado(
            {
              texto: formatarNaoEncontrado(pendente.titulo),
              confirmacaoPendente: null,
            },
            diaAnterior,
          );
        }
        return comDiaConsultado(
          await montarAlteracao(compromisso, destino, calendario),
          diaAnterior,
        );
      }
      return comDiaConsultado(
        {
          texto: formatarPedirDestinoAlteracao(pendente.titulo),
          confirmacaoPendente: pendente,
        },
        diaAnterior,
      );
    }
  }

  if (
    pendente &&
    (ehCompletarDuracaoPeriodo(pendente) || ehCompletarDiasPeriodo(pendente))
  ) {
    if (intencao.tipo === "recusar") {
      return comDiaConsultado(
        { texto: "Ok, não marco.", confirmacaoPendente: null },
        diaAnterior,
      );
    }
    const pedidoNovo =
      (intencao.tipo === "alterar" ||
        intencao.tipo === "alterar_sem_destino" ||
        intencao.tipo === "cancelar" ||
        intencao.tipo === "marcar_pontual" ||
        intencao.tipo === "marcar_pontual_sem_hora" ||
        intencao.tipo === "marcar_incompleta" ||
        intencao.tipo === "marcar_periodo" ||
        intencao.tipo === "marcar_periodo_sem_duracao") &&
      ehPedidoNovo(intencao, entrada.mensagem);
    if (!pedidoNovo) {
      const resposta = interpretarRespostaDuracao(
        entrada.mensagem,
        entrada.agora,
        pendente.dia,
      );
      if (resposta?.tipo === "mais_dias") {
        return pedirDiasPeriodo(pendente.titulo, pendente.dia, diaAnterior);
      }
      const periodo = resposta
        ? periodoAPartirDaDuracao(resposta, pendente.dia)
        : null;
      if (periodo) {
        return comDiaConsultado(
          await saidaDeConfirmacao(
            {
              acao: "marcar_periodo",
              titulo: pendente.titulo,
              primeiroDia: periodo.primeiroDia,
              ultimoDia: periodo.ultimoDia,
            },
            calendario,
          ),
          diaAnterior,
        );
      }
      if (ehCompletarDiasPeriodo(pendente)) {
        return pedirDiasPeriodo(pendente.titulo, pendente.dia, diaAnterior);
      }
      if (!pedidoNovo && intencao.tipo !== "confirmar") {
        return pedirDuracaoPeriodo(pendente.titulo, pendente.dia, diaAnterior);
      }
    }
  }

  if (pendente && ehCompletarMarcacao(pendente)) {
    if (intencao.tipo === "recusar") {
      return comDiaConsultado(
        { texto: "Ok, não marco.", confirmacaoPendente: null },
        diaAnterior,
      );
    }
    if (intencao.tipo === "confirmar") {
      return comDiaConsultado(
        {
          texto: pendente.dia
            ? formatarPedirHorarioMarcacao(pendente.titulo, pendente.dia)
            : formatarPedirDiaEHorarioMarcacao(pendente.titulo),
          confirmacaoPendente: pendente,
        },
        diaAnterior,
      );
    }
    if (
      intencao.tipo !== "alterar" &&
      intencao.tipo !== "alterar_sem_destino" &&
      intencao.tipo !== "cancelar" &&
      intencao.tipo !== "marcar_periodo"
    ) {
      const completa = completarMarcacaoPontual(
        pendente.titulo,
        pendente.dia,
        entrada.mensagem,
        entrada.agora,
      );
      if (completa.tipo === "marcar_pontual") {
        return comDiaConsultado(
          await saidaDeConfirmacao(
            {
              acao: "marcar_pontual",
              titulo: completa.titulo,
              inicio: completa.inicio,
              fim: completa.fim,
            },
            calendario,
          ),
          diaAnterior,
        );
      }
      if (completa.tipo === "marcar_pontual_sem_hora") {
        return pedirHorarioMarcacao(
          completa.titulo,
          completa.dia,
          diaAnterior,
        );
      }
      return comDiaConsultado(
        {
          texto: pendente.dia
            ? formatarPedirHorarioMarcacao(pendente.titulo, pendente.dia)
            : formatarPedirDiaEHorarioMarcacao(pendente.titulo),
          confirmacaoPendente: pendente,
        },
        diaAnterior,
      );
    }
  }

  if (pendente?.acao === "escolher_cancelamento") {
    if (intencao.tipo === "recusar") {
      return comDiaConsultado(
        { texto: RESPOSTA_DEIXO_PRA_LA, confirmacaoPendente: null },
        diaAnterior,
      );
    }
    const pares = await paresDosCandidatos(
      pendente.candidatos,
      calendario,
      entrada.agora,
    );
    const escolhidos = casarEscolha(entrada.mensagem, pares, entrada.agora);
    if (escolhidos.length === 1) {
      const compromisso = escolhidos[0].compromisso;
      if (!compromisso) {
        return {
          texto: formatarNaoEncontrado(escolhidos[0].rotulo),
          confirmacaoPendente: null,
        };
      }
      return confirmacaoDeCancelamento(compromisso);
    }
    if (escolhidos.length > 1) {
      return relistarCandidatos(escolhidos, "cancelar", entrada.agora);
    }
    if (
      ehMutacaoCurta(intencao) ||
      (!ehPedidoNovo(intencao, entrada.mensagem) && intencao.tipo !== "cancelar")
    ) {
      return relistarCandidatos(pares, "cancelar", entrada.agora);
    }
  }

  if (pendente?.acao === "escolher_alteracao") {
    if (intencao.tipo === "recusar") {
      return comDiaConsultado(
        { texto: RESPOSTA_DEIXO_PRA_LA, confirmacaoPendente: null },
        diaAnterior,
      );
    }
    const pares = await paresDosCandidatos(
      pendente.candidatos,
      calendario,
      entrada.agora,
    );
    const escolhidos = casarEscolha(entrada.mensagem, pares, entrada.agora);
    if (escolhidos.length === 1) {
      const compromisso = escolhidos[0].compromisso;
      if (!compromisso) {
        return {
          texto: formatarNaoEncontrado(escolhidos[0].rotulo),
          confirmacaoPendente: null,
        };
      }
      if (!pendente.destino) {
        return {
          texto: formatarPedirDestinoAlteracao(compromisso.titulo),
          confirmacaoPendente: {
            acao: "completar_alteracao",
            id: compromisso.id,
            titulo: compromisso.titulo,
          },
        };
      }
      return montarAlteracao(compromisso, pendente.destino, calendario);
    }
    if (escolhidos.length > 1) {
      return relistarCandidatos(
        escolhidos,
        "alterar",
        entrada.agora,
        pendente.destino,
      );
    }
    if (
      ehMutacaoCurta(intencao) ||
      (!ehPedidoNovo(intencao, entrada.mensagem) &&
        intencao.tipo !== "alterar" &&
        intencao.tipo !== "alterar_sem_destino")
    ) {
      return relistarCandidatos(
        pares,
        "alterar",
        entrada.agora,
        pendente.destino,
      );
    }
  }

  const itensDoContexto = pendente ? candidatosDoContexto(pendente) : null;
  if (pendente && itensDoContexto && ehMutacaoCurta(intencao)) {
    const pares = await paresDosCandidatos(
      itensDoContexto,
      calendario,
      entrada.agora,
    );
    const vivos = pares.filter((p) => p.compromisso);
    if (vivos.length === 0) {
      return comDiaConsultado(
        { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null },
        diaAnterior,
      );
    }
    if (intencao.tipo === "cancelar") {
      if (vivos.length === 1) {
        return comDiaConsultado(
          confirmacaoDeCancelamento(vivos[0].compromisso!),
          diaAnterior,
        );
      }
      return comDiaConsultado(
        relistarCandidatos(vivos, "cancelar", entrada.agora),
        diaAnterior,
      );
    }
    if (vivos.length === 1) {
      const compromisso = vivos[0].compromisso!;
      return comDiaConsultado(
        {
          texto: formatarPedirDestinoAlteracao(compromisso.titulo),
          confirmacaoPendente: {
            acao: "completar_alteracao",
            id: compromisso.id,
            titulo: compromisso.titulo,
          },
        },
        diaAnterior,
      );
    }
    return comDiaConsultado(
      relistarCandidatos(vivos, "alterar", entrada.agora),
      diaAnterior,
    );
  }

  if (intencao.tipo === "confirmar") {
    if (
      !pendente ||
      ehEscolha(pendente) ||
      ehContextoListagem(pendente) ||
      ehCompletarMarcacao(pendente) ||
      ehCompletarAlteracao(pendente) ||
      ehCompletarDuracaoPeriodo(pendente) ||
      ehCompletarDiasPeriodo(pendente) ||
      ehListagemPaginada(pendente)
    ) {
      return comDiaConsultado(
        { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: pendente },
        diaAnterior,
      );
    }
    if (pendente.acao === "marcar_periodo") {
      await calendario.criar({
        tipo: "periodo",
        titulo: pendente.titulo,
        primeiroDia: pendente.primeiroDia,
        ultimoDia: pendente.ultimoDia,
      });
      return {
        texto: formatarPeriodoMarcado(pendente),
        confirmacaoPendente: null,
        diaParaCalendario: pendente.primeiroDia,
      };
    }
    if (pendente.acao === "marcar_pontual") {
      await calendario.criar({
        tipo: "pontual",
        titulo: pendente.titulo,
        inicio: pendente.inicio,
        fim: pendente.fim,
      });
      return {
        texto: formatarPontualMarcado(pendente),
        confirmacaoPendente: null,
        diaParaCalendario: diaCivil(
          DateTime.fromISO(pendente.inicio, { setZone: true }),
        ),
      };
    }
    if (pendente.acao === "alterar_periodo") {
      await calendario.alterar(pendente.id, {
        tipo: "periodo",
        titulo: pendente.titulo,
        primeiroDia: pendente.primeiroDia,
        ultimoDia: pendente.ultimoDia,
      });
      return {
        texto: formatarPeriodoAlterado(pendente),
        confirmacaoPendente: null,
      };
    }
    if (pendente.acao === "alterar_pontual") {
      await calendario.alterar(pendente.id, {
        tipo: "pontual",
        titulo: pendente.titulo,
        inicio: pendente.inicio,
        fim: pendente.fim,
      });
      return {
        texto: formatarPontualAlterado(pendente),
        confirmacaoPendente: null,
      };
    }
    if (pendente.acao === "cancelar_periodo") {
      await calendario.cancelar(pendente.id);
      return {
        texto: formatarPeriodoCancelado(pendente),
        confirmacaoPendente: null,
      };
    }
    await calendario.cancelar(pendente.id);
    return {
      texto: formatarPontualCancelado(pendente),
      confirmacaoPendente: null,
    };
  }

  if (pendente && ehConfirmacaoCorrigivel(pendente) && ehRecusaPura(entrada.mensagem)) {
    return {
      texto: RESPOSTA_O_QUE_MUDAR,
      confirmacaoPendente: { ...pendente, aguardandoCorrecao: true },
    };
  }

  if (pendente && ehConfirmacaoCorrigivel(pendente) && ehAbortarConfirmacao(entrada.mensagem)) {
    return {
      texto: RESPOSTA_DEIXO_PRA_LA,
      confirmacaoPendente: null,
    };
  }

  if (
    pendente &&
    ehAlteracao(pendente) &&
    (pendente.aguardandoCorrecao || temPrefixoDeRecusa(entrada.mensagem)) &&
    !ehPedidoNovo(intencao, entrada.mensagem)
  ) {
    const destino = interpretarDestinoAlteracao(entrada.mensagem, entrada.agora);
    if (destino) {
      const corrigida = await corrigirAlteracao(pendente, destino, calendario);
      if (corrigida) return corrigida;
    }
    return {
      texto: RESPOSTA_O_QUE_MUDAR,
      confirmacaoPendente: { ...pendente, aguardandoCorrecao: true },
    };
  }

  if (
    pendente &&
    ehConfirmacaoMarcacao(pendente) &&
    (pendente.aguardandoCorrecao || temPrefixoDeRecusa(entrada.mensagem)) &&
    !ehPedidoNovo(intencao, entrada.mensagem)
  ) {
    const corrigida = aplicarCorrecao(
      pendente,
      entrada.mensagem,
      entrada.agora,
    );
    if (!corrigida || !ehConfirmacaoMarcacao(corrigida)) {
      return {
        texto: RESPOSTA_O_QUE_MUDAR,
        confirmacaoPendente: { ...pendente, aguardandoCorrecao: true },
      };
    }
    return saidaDeConfirmacao(
      { ...corrigida, aguardandoCorrecao: false },
      calendario,
    );
  }

  if (intencao.tipo === "alterar" || intencao.tipo === "alterar_sem_destino") {
    if (!intencao.termo && intencao.tipo === "alterar_sem_destino") {
      return comDiaConsultado(
        { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null },
        diaAnterior,
      );
    }
    const existentes = await calendario.listar(janelaDeBusca(entrada.agora));
    const candidatos = filtrarCandidatos(
      existentes,
      intencao.termo,
      intencao.dia,
    );
    if (candidatos.length === 0) {
      return {
        texto: formatarNaoEncontrado(intencao.termo),
        confirmacaoPendente: null,
      };
    }
    if (intencao.tipo === "alterar_sem_destino") {
      if (candidatos.length > 1) {
        const lista = candidatosDe(candidatos, entrada.agora);
        return {
          texto: formatarListaCandidatos(lista.map((c) => c.rotulo)),
          confirmacaoPendente: {
            acao: "escolher_alteracao",
            candidatos: lista,
            em: emIso(entrada.agora),
          },
        };
      }
      return {
        texto: formatarPedirDestinoAlteracao(candidatos[0].titulo),
        confirmacaoPendente: {
          acao: "completar_alteracao",
          id: candidatos[0].id,
          titulo: candidatos[0].titulo,
        },
      };
    }
    if (candidatos.length > 1) {
      const lista = candidatosDe(candidatos, entrada.agora);
      const proposta: ConfirmacaoEscolherAlteracao = {
        acao: "escolher_alteracao",
        candidatos: lista,
        destino: intencao.destino,
        em: emIso(entrada.agora),
      };
      return {
        texto: formatarListaCandidatos(lista.map((c) => c.rotulo)),
        confirmacaoPendente: proposta,
      };
    }
    return montarAlteracao(candidatos[0], intencao.destino, calendario);
  }

  if (intencao.tipo === "cancelar") {
    if (!intencao.termo && intencao.dia == null) {
      return comDiaConsultado(
        { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null },
        diaAnterior,
      );
    }
    const existentes = await calendario.listar(janelaDeBusca(entrada.agora));
    const porTermo = existentes.filter((c) =>
      casaComTermo(c.titulo, intencao.termo),
    );
    let candidatos = porTermo;
    if (intencao.dia?.mes != null) {
      candidatos = filtrarCandidatos(existentes, intencao.termo, intencao.dia);
    } else if (intencao.dia && porTermo.some((c) => c.tipo === "periodo")) {
      return {
        texto: RESPOSTA_ALTERACAO_DOS_EXTREMOS,
        confirmacaoPendente: null,
      };
    }
    if (candidatos.length === 0) {
      return {
        texto: formatarNaoEncontrado(intencao.termo),
        confirmacaoPendente: null,
      };
    }
    if (candidatos.length > 1) {
      const lista = candidatosDe(candidatos, entrada.agora);
      const proposta: ConfirmacaoEscolherCancelamento = {
        acao: "escolher_cancelamento",
        candidatos: lista,
        em: emIso(entrada.agora),
      };
      return {
        texto: formatarListaCandidatos(lista.map((c) => c.rotulo), "cancelar"),
        confirmacaoPendente: proposta,
      };
    }
    return confirmacaoDeCancelamento(candidatos[0]);
  }

  const saidaListagem = await processarIntencaoListagem(
    intencao,
    pendente,
    entrada.agora,
    calendario,
  );
  if (saidaListagem) {
    return comDiaConsultado(saidaListagem, diaAnterior);
  }

  if (intencao.tipo === "desconhecida" || intencao.tipo === "recusar") {
    return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
  }

  if (intencao.tipo === "consulta_dia") {
    const compromissos = await calendario.listar({
      inicio: inicioDoDia(intencao.dia).toISO()!,
      fim: fimDoDia(intencao.dia).toISO()!,
    });
    return {
      texto: formatarConsultaDia(intencao.dia, compromissos, entrada.agora),
      confirmacaoPendente:
        compromissos.length > 0
          ? {
              acao: "contexto_listagem",
              candidatos: candidatosDe(compromissos, entrada.agora),
              em: emIso(entrada.agora),
            }
          : null,
      ultimoDiaConsultado: intencao.dia,
      diaParaCalendario: intencao.dia,
    };
  }

  if (intencao.tipo === "consulta_intervalo") {
    const compromissos = await calendario.listar({
      inicio: inicioDoDia(intencao.primeiroDia).toISO()!,
      fim: fimDoDia(intencao.ultimoDia).toISO()!,
    });
    return {
      texto: formatarConsultaIntervalo(
        intencao.primeiroDia,
        intencao.ultimoDia,
        compromissos,
        entrada.agora,
      ),
      confirmacaoPendente:
        compromissos.length > 0
          ? {
              acao: "contexto_listagem",
              candidatos: candidatosDe(compromissos, entrada.agora),
              em: emIso(entrada.agora),
            }
          : null,
      ultimoDiaConsultado: intencao.primeiroDia,
      diaParaCalendario: intencao.primeiroDia,
    };
  }

  if (intencao.tipo === "marcar_periodo_sem_duracao") {
    return pedirDuracaoPeriodo(intencao.titulo, intencao.dia, diaAnterior);
  }

  if (intencao.tipo === "marcar_pontual_sem_hora") {
    return pedirHorarioMarcacao(intencao.titulo, intencao.dia, diaAnterior);
  }

  if (intencao.tipo === "marcar_incompleta") {
    if (diaAnterior) {
      return pedirHorarioMarcacao(
        intencao.titulo,
        diaAnterior,
        diaAnterior,
      );
    }
    return comDiaConsultado(
      {
        texto: formatarPedirDiaEHorarioMarcacao(intencao.titulo),
        confirmacaoPendente: {
          acao: "completar_marcacao",
          titulo: intencao.titulo,
        },
      },
      diaAnterior,
    );
  }

  if (intencao.tipo === "marcar_pontual" || intencao.tipo === "marcar_periodo") {
    const proposta: ConfirmacaoMarcacao =
      intencao.tipo === "marcar_pontual"
        ? {
            acao: "marcar_pontual",
            titulo: intencao.titulo,
            inicio: intencao.inicio,
            fim: intencao.fim,
          }
        : {
            acao: "marcar_periodo",
            titulo: intencao.titulo,
            primeiroDia: intencao.primeiroDia,
            ultimoDia: intencao.ultimoDia,
          };
    return saidaDeConfirmacao(proposta, calendario);
  }

  return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: null };
}
