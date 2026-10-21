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
  ehConfirmacaoMarcacao,
  ehConfirmacaoPendente,
  type ConfirmacaoAlterarPeriodo,
  type ConfirmacaoAlterarPontual,
  type ConfirmacaoEscolherAlteracao,
  type ConfirmacaoMarcacao,
  type ConfirmacaoPendente,
} from "./confirmacao";
import {
  aplicarCorrecao,
  ehRecusaPura,
  temPrefixoDeRecusa,
} from "./corrigir-confirmacao";
import { FalhaDoCalendario, RESPOSTA_NAO_GRAVADO } from "./falha-calendario";
import {
  formatarConfirmacao,
  formatarConfirmacaoAlterarPeriodo,
  formatarConfirmacaoAlterarPontual,
  formatarConsultaDia,
  formatarConsultaIntervalo,
  formatarListaCandidatos,
  formatarNaoEncontrado,
  formatarPeriodoAlterado,
  formatarPeriodoMarcado,
  formatarPontualAlterado,
  formatarPontualMarcado,
  RESPOSTA_NAO_ENTENDI,
  RESPOSTA_O_QUE_MUDAR,
  rotuloCandidato,
} from "./formatar-resposta";
import { fimDoDia, inicioDoDia } from "./fuso";
import {
  interpretarDestinoAlteracao,
  interpretarMensagem,
  type DestinoAlteracao,
} from "./interpretador";
import { DateTime } from "luxon";

export type EntradaConversa = {
  mensagem: string;
  /** Relógio congelado nos testes; nunca ler Date.now() no núcleo. */
  agora: DateTime;
  /**
   * Proposta do turno anterior. O chamador devolve; o servidor não a guarda.
   */
  confirmacaoPendente?: ConfirmacaoPendente | null;
};

export type SaidaConversa = {
  texto: string;
  confirmacaoPendente: ConfirmacaoPendente | null;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function casaComTermo(titulo: string, termo: string): boolean {
  const tituloN = normalizar(titulo);
  const palavras = normalizar(termo)
    .split(/\s+/u)
    .filter(
      (p) => p.length > 1 && !["de", "da", "do", "com", "as", "os"].includes(p),
    );
  if (palavras.length === 0) return tituloN.includes(normalizar(termo));
  return palavras.every((p) => tituloN.includes(p));
}

function casarEscolha(
  mensagem: string,
  candidatos: ConfirmacaoEscolherAlteracao["candidatos"],
): ConfirmacaoEscolherAlteracao["candidatos"] {
  const bruto = normalizar(mensagem).replace(
    /^(?:a|o|essa|esse|este|quero)\s+(?:de\s+)?/u,
    "",
  );
  return candidatos.filter((c) => normalizar(c.rotulo).includes(bruto));
}

function ehAlteracao(
  pendente: ConfirmacaoPendente,
): pendente is ConfirmacaoAlterarPontual | ConfirmacaoAlterarPeriodo {
  return pendente.acao === "alterar_pontual" || pendente.acao === "alterar_periodo";
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
  if (compromisso.tipo === "periodo" && proposto.tipo === "periodo") {
    const proposta: ConfirmacaoAlterarPeriodo = {
      acao: "alterar_periodo",
      id: compromisso.id,
      titulo: compromisso.titulo,
      primeiroDiaAtual: compromisso.primeiroDia,
      ultimoDiaAtual: compromisso.ultimoDia,
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
    return await processarTurnoInterno(entrada, calendario);
  } catch (erro) {
    if (erro instanceof FalhaDoCalendario) {
      return {
        texto: RESPOSTA_NAO_GRAVADO,
        confirmacaoPendente: pendenteInicial,
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
  const pendente = ehConfirmacaoPendente(entrada.confirmacaoPendente)
    ? entrada.confirmacaoPendente
    : null;

  if (pendente?.acao === "escolher_alteracao" && intencao.tipo !== "alterar") {
    const escolhidos = casarEscolha(entrada.mensagem, pendente.candidatos);
    if (escolhidos.length === 1) {
      const todos = await calendario.listar(janelaDeBusca(entrada.agora));
      const compromisso = todos.find((c) => c.id === escolhidos[0].id);
      if (!compromisso) {
        return {
          texto: formatarNaoEncontrado(escolhidos[0].rotulo),
          confirmacaoPendente: null,
        };
      }
      return montarAlteracao(compromisso, pendente.destino, calendario);
    }
    if (escolhidos.length > 1) {
      return {
        texto: formatarListaCandidatos(escolhidos.map((c) => c.rotulo)),
        confirmacaoPendente: { ...pendente, candidatos: escolhidos },
      };
    }
  }

  if (intencao.tipo === "confirmar") {
    if (!pendente || pendente.acao === "escolher_alteracao") {
      return { texto: RESPOSTA_NAO_ENTENDI, confirmacaoPendente: pendente };
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

  if (pendente && pendente.acao !== "escolher_alteracao" && ehRecusaPura(entrada.mensagem)) {
    return {
      texto: RESPOSTA_O_QUE_MUDAR,
      confirmacaoPendente: { ...pendente, aguardandoCorrecao: true },
    };
  }

  if (
    pendente &&
    ehAlteracao(pendente) &&
    (pendente.aguardandoCorrecao || temPrefixoDeRecusa(entrada.mensagem)) &&
    intencao.tipo !== "alterar"
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
    (pendente.aguardandoCorrecao || temPrefixoDeRecusa(entrada.mensagem))
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

  if (intencao.tipo === "alterar") {
    const existentes = await calendario.listar(janelaDeBusca(entrada.agora));
    const candidatos = existentes.filter((c) =>
      casaComTermo(c.titulo, intencao.termo),
    );
    if (candidatos.length === 0) {
      return {
        texto: formatarNaoEncontrado(intencao.termo),
        confirmacaoPendente: null,
      };
    }
    if (candidatos.length > 1) {
      const lista = candidatos.map((c) => ({
        id: c.id,
        rotulo: rotuloCandidato(c),
      }));
      const proposta: ConfirmacaoEscolherAlteracao = {
        acao: "escolher_alteracao",
        candidatos: lista,
        destino: intencao.destino,
      };
      return {
        texto: formatarListaCandidatos(lista.map((c) => c.rotulo)),
        confirmacaoPendente: proposta,
      };
    }
    return montarAlteracao(candidatos[0], intencao.destino, calendario);
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
      texto: formatarConsultaDia(intencao.dia, compromissos),
      confirmacaoPendente: null,
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
      ),
      confirmacaoPendente: null,
    };
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
