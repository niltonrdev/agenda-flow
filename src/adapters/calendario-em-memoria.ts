import type { Calendario, IntervaloCalendario } from "@/domain/calendario";
import type { Compromisso, NovoCompromisso } from "@/domain/compromisso";
import { FUSO_DONO, resolverAnoDaData } from "@/domain/fuso";
import { DateTime } from "luxon";

function sobrepoeIntervalo(
  compromisso: Compromisso,
  intervalo: IntervaloCalendario,
): boolean {
  const inicio = DateTime.fromISO(intervalo.inicio, { setZone: true });
  const fim = DateTime.fromISO(intervalo.fim, { setZone: true });

  if (compromisso.tipo === "pontual") {
    const cInicio = DateTime.fromISO(compromisso.inicio, { setZone: true });
    const cFim = DateTime.fromISO(compromisso.fim, { setZone: true });
    return cInicio < fim && cFim > inicio;
  }

  const periodoInicio = DateTime.fromISO(compromisso.primeiroDia, {
    zone: FUSO_DONO,
  }).startOf("day");
  const periodoFim = DateTime.fromISO(compromisso.ultimoDia, {
    zone: FUSO_DONO,
  }).endOf("day");
  return periodoInicio < fim && periodoFim > inicio;
}

export type CalendarioEmMemoria = Calendario & {
  /** Snapshot para asserts: nada gravado indevidamente. */
  listarTodos(): Compromisso[];
};

export function criarCalendarioEmMemoria(
  iniciais: Compromisso[] = [],
): CalendarioEmMemoria {
  const itens = new Map<string, Compromisso>(
    iniciais.map((c) => [c.id, structuredClone(c)]),
  );
  let sequencia = iniciais.length + 1;

  return {
    async listar(intervalo) {
      return [...itens.values()].filter((c) => sobrepoeIntervalo(c, intervalo));
    },

    async criar(compromisso: NovoCompromisso) {
      const id = `mem-${sequencia++}`;
      const criado = { ...compromisso, id } as Compromisso;
      itens.set(id, criado);
      return structuredClone(criado);
    },

    async alterar(id, mudancas) {
      const atual = itens.get(id);
      if (!atual) {
        throw new Error(`Compromisso não encontrado: ${id}`);
      }
      const tipo = mudancas.tipo ?? atual.tipo;
      let atualizado: Compromisso;
      if (tipo === "periodo") {
        const periodo =
          mudancas.tipo === "periodo"
            ? mudancas
            : (mudancas as Partial<Extract<NovoCompromisso, { tipo: "periodo" }>>);
        const primeiroDia =
          periodo.primeiroDia ??
          (atual.tipo === "periodo"
            ? atual.primeiroDia
            : DateTime.fromISO(atual.inicio, { setZone: true })
                .setZone(FUSO_DONO)
                .toISODate()!);
        const ultimoDia =
          periodo.ultimoDia ??
          (atual.tipo === "periodo" ? atual.ultimoDia : primeiroDia);
        atualizado = {
          id,
          tipo: "periodo",
          titulo: mudancas.titulo ?? atual.titulo,
          primeiroDia,
          ultimoDia,
        };
      } else {
        const pontual =
          mudancas.tipo === "pontual"
            ? mudancas
            : (mudancas as Partial<Extract<NovoCompromisso, { tipo: "pontual" }>>);
        const inicio =
          pontual.inicio ??
          (atual.tipo === "pontual"
            ? atual.inicio
            : `${atual.primeiroDia}T09:00:00.000-03:00`);
        const fim =
          pontual.fim ??
          (atual.tipo === "pontual"
            ? atual.fim
            : `${atual.ultimoDia}T10:00:00.000-03:00`);
        atualizado = {
          id,
          tipo: "pontual",
          titulo: mudancas.titulo ?? atual.titulo,
          inicio,
          fim,
        };
      }
      itens.set(id, atualizado);
      return structuredClone(atualizado);
    },

    async cancelar(id) {
      if (!itens.delete(id)) {
        throw new Error(`Compromisso não encontrado: ${id}`);
      }
    },

    listarTodos() {
      return [...itens.values()].map((c) => structuredClone(c));
    },
  };
}

/**
 * Compromissos de demonstração alinhados ao mesmo "agora" da Conversa,
 * para "7 de setembro" e "15 de novembro" encontrarem a Cirurgia e a Ana.
 */
export function compromissosDeDemonstracao(agora: DateTime): Compromisso[] {
  const diaCirurgia = resolverAnoDaData(7, 9, agora);
  const anoCirurgia = DateTime.fromISO(diaCirurgia, { zone: FUSO_DONO }).year;
  const diaAna = resolverAnoDaData(15, 11, agora);

  const inicioAna = DateTime.fromISO(diaAna, { zone: FUSO_DONO }).set({
    hour: 15,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return [
    {
      id: "demo-cirurgia",
      titulo: "Cirurgia",
      tipo: "periodo",
      primeiroDia: diaCirurgia,
      ultimoDia: diaCirurgia,
    },
    {
      id: "demo-reuniao-ana",
      titulo: "Reunião com a Ana",
      tipo: "pontual",
      inicio: inicioAna.toISO()!,
      fim: inicioAna.plus({ hours: 1 }).toISO()!,
    },
    {
      id: "demo-pescaria",
      titulo: "Pescaria",
      tipo: "periodo",
      primeiroDia: `${anoCirurgia}-09-04`,
      ultimoDia: `${anoCirurgia}-09-06`,
    },
  ];
}

export function criarCalendarioDeDemonstracao(
  agora: DateTime = DateTime.now().setZone(FUSO_DONO),
): CalendarioEmMemoria {
  return criarCalendarioEmMemoria(compromissosDeDemonstracao(agora));
}
