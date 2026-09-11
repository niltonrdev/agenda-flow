import type { Calendario, IntervaloCalendario } from "@/domain/calendario";
import type { Compromisso, NovoCompromisso } from "@/domain/compromisso";
import { FUSO_DONO } from "@/domain/fuso";
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
      const atualizado = { ...atual, ...mudancas, id, tipo: atual.tipo } as Compromisso;
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

/** Compromissos de demonstração, incluindo a cirurgia no feriado de 7 de setembro. */
export function compromissosDeDemonstracao(): Compromisso[] {
  return [
    {
      id: "demo-cirurgia",
      titulo: "Cirurgia",
      tipo: "periodo",
      primeiroDia: "2025-09-07",
      ultimoDia: "2025-09-07",
    },
    {
      id: "demo-reuniao-ana",
      titulo: "Reunião com a Ana",
      tipo: "pontual",
      inicio: DateTime.fromObject(
        { year: 2025, month: 11, day: 15, hour: 15, minute: 0 },
        { zone: FUSO_DONO },
      ).toISO()!,
      fim: DateTime.fromObject(
        { year: 2025, month: 11, day: 15, hour: 16, minute: 0 },
        { zone: FUSO_DONO },
      ).toISO()!,
    },
    {
      id: "demo-pescaria",
      titulo: "Pescaria",
      tipo: "periodo",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    },
  ];
}

export function criarCalendarioDeDemonstracao(): CalendarioEmMemoria {
  return criarCalendarioEmMemoria(compromissosDeDemonstracao());
}
