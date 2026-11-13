import {
  criarCalendarioGoogle,
  ehCalendarioDeFeriado,
  eventoGoogleParaCompromisso,
  idDoCompromisso,
  periodoParaEventoGoogle,
  pontualParaEventoGoogle,
} from "@/adapters/calendario-google";
import { FalhaDoCalendario } from "@/domain/falha-calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

describe("conversão Período ↔ dia inteiro no Google", () => {
  it("grava a data final exclusiva no evento, não no domínio", () => {
    expect(periodoParaEventoGoogle("Pescaria", "2025-09-04", "2025-09-07")).toEqual({
      summary: "Pescaria",
      start: { date: "2025-09-04" },
      end: { date: "2025-09-08" },
    });
  });

  it("lê a data final exclusiva de volta para o último dia inclusive", () => {
    const compromisso = eventoGoogleParaCompromisso("primary", {
      id: "evt-1",
      summary: "Pescaria",
      start: { date: "2025-09-04" },
      end: { date: "2025-09-08" },
    });
    expect(compromisso).toEqual({
      id: idDoCompromisso("primary", "evt-1"),
      titulo: "Pescaria",
      tipo: "periodo",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });
  });

  it("lê a descrição só para casar localmente, no mesmo events.list", () => {
    const compromisso = eventoGoogleParaCompromisso("primary", {
      id: "evt-desc",
      summary: "Consulta",
      description: "dentista na clínica",
      start: { dateTime: "2026-11-20T15:00:00-03:00" },
      end: { dateTime: "2026-11-20T16:00:00-03:00" },
    });
    expect(compromisso).toMatchObject({
      titulo: "Consulta",
      descricao: "dentista na clínica",
    });
  });
});

describe("calendário de feriados nacionais", () => {
  it("não trata o calendário de feriados como Compromisso do Dono", () => {
    expect(
      ehCalendarioDeFeriado({
        id: "pt-br.brazilian#holiday@group.v.calendar.google.com",
        summary: "Feriados no Brasil",
      }),
    ).toBe(true);
    expect(
      ehCalendarioDeFeriado({
        id: "dono@gmail.com",
        summary: "Dono",
        primary: true,
      }),
    ).toBe(false);
  });
});

describe("adaptador Google — porta Calendário", () => {
  it("lê Compromissos de todas as agendas visíveis, inclusive ocorrência recorrente no recorte", async () => {
    const pedidos: string[] = [];
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        return [
          { id: "primary-cal", summary: "Principal", primary: true, selected: true },
          { id: "trabalho", summary: "Trabalho", selected: true },
          {
            id: "en.brazilian#holiday@group.v.calendar.google.com",
            summary: "Feriados no Brasil",
            selected: true,
          },
          { id: "escondida", summary: "Escondida", selected: false },
        ];
      },
      async listarEventos(calendarId, intervalo) {
        pedidos.push(`${calendarId}|${intervalo.inicio}|${intervalo.fim}`);
        if (calendarId === "primary-cal") {
          return [
            {
              id: "cirurgia",
              summary: "Cirurgia",
              start: { date: "2025-09-07" },
              end: { date: "2025-09-08" },
            },
          ];
        }
        if (calendarId === "trabalho") {
          return [
            {
              id: "standup_20250905T120000Z",
              summary: "Standup",
              recurringEventId: "standup",
              start: { dateTime: "2025-09-05T09:00:00-03:00" },
              end: { dateTime: "2025-09-05T09:15:00-03:00" },
            },
          ];
        }
        throw new Error(`não deveria listar ${calendarId}`);
      },
      async obterEvento() {
        throw new Error("não obter");
      },
      async criarEvento() {
        throw new Error("não criar");
      },
      async alterarEvento() {
        throw new Error("não alterar");
      },
      async cancelarEvento() {
        throw new Error("não cancelar");
      },
    });

    const listados = await calendario.listar({
      inicio: "2025-09-04T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });

    expect(pedidos.map((p) => p.split("|")[0])).toEqual(["primary-cal", "trabalho"]);
    expect(listados.map((c) => c.titulo).sort()).toEqual(["Cirurgia", "Standup"]);
    expect(listados.find((c) => c.titulo === "Standup")).toMatchObject({
      tipo: "pontual",
      inicio: "2025-09-05T09:00:00-03:00",
    });
  });

  it("grava Pontual e Período só na agenda principal", async () => {
    const gravados: { calendarId: string; summary: string }[] = [];
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        return [];
      },
      async listarEventos() {
        return [];
      },
      async obterEvento() {
        throw new Error("não obter");
      },
      async criarEvento(calendarId, evento) {
        gravados.push({ calendarId, summary: evento.summary });
        return { id: "novo", ...evento };
      },
      async alterarEvento() {
        throw new Error("não alterar");
      },
      async cancelarEvento() {
        throw new Error("não cancelar");
      },
    });

    const inicio = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15 },
      { zone: FUSO_DONO },
    );
    await calendario.criar({
      tipo: "pontual",
      titulo: "Reunião com a Ana",
      inicio: inicio.toISO()!,
      fim: inicio.plus({ hours: 1 }).toISO()!,
    });
    await calendario.criar({
      tipo: "periodo",
      titulo: "Pescaria",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });

    expect(gravados).toEqual([
      { calendarId: "primary", summary: "Reunião com a Ana" },
      { calendarId: "primary", summary: "Pescaria" },
    ]);
  });

  it("altera e cancela no Compromisso certo, na agenda de origem", async () => {
    const mutacoes: string[] = [];
    const id = idDoCompromisso("trabalho", "standup_20250905T120000Z");
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        return [{ id: "trabalho", summary: "Trabalho", selected: true }];
      },
      async listarEventos() {
        return [];
      },
      async obterEvento(calendarId, eventId) {
        mutacoes.push(`obter:${calendarId}:${eventId}`);
        return {
          id: eventId,
          summary: "Standup",
          start: { dateTime: "2025-09-05T09:00:00-03:00" },
          end: { dateTime: "2025-09-05T09:15:00-03:00" },
        };
      },
      async criarEvento() {
        throw new Error("não criar");
      },
      async alterarEvento(calendarId, eventId, evento) {
        mutacoes.push(`alterar:${calendarId}:${eventId}:${evento.summary}`);
        return { id: eventId, ...evento };
      },
      async cancelarEvento(calendarId, eventId) {
        mutacoes.push(`cancelar:${calendarId}:${eventId}`);
      },
    });

    const inicio = DateTime.fromObject(
      { year: 2025, month: 9, day: 5, hour: 10 },
      { zone: FUSO_DONO },
    );
    await calendario.alterar(id, {
      tipo: "pontual",
      titulo: "Standup",
      inicio: inicio.toISO()!,
      fim: inicio.plus({ minutes: 15 }).toISO()!,
    });
    await calendario.cancelar(id);

    expect(mutacoes).toEqual([
      "obter:trabalho:standup_20250905T120000Z",
      "alterar:trabalho:standup_20250905T120000Z:Standup",
      "obter:trabalho:standup_20250905T120000Z",
      "cancelar:trabalho:standup_20250905T120000Z",
    ]);
  });

  it("recusa alterar ou cancelar em agenda oculta ou evento inexistente", async () => {
    const idOculto = idDoCompromisso("escondida", "evt-1");
    const idVisivel = idDoCompromisso("trabalho", "sumido");
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        return [
          { id: "trabalho", summary: "Trabalho", selected: true },
          { id: "escondida", summary: "Escondida", selected: false },
        ];
      },
      async listarEventos() {
        return [];
      },
      async obterEvento() {
        return { status: "cancelled" };
      },
      async criarEvento() {
        throw new Error("não criar");
      },
      async alterarEvento() {
        throw new Error("não deveria alterar");
      },
      async cancelarEvento() {
        throw new Error("não deveria cancelar");
      },
    });

    await expect(
      calendario.alterar(idOculto, {
        tipo: "pontual",
        titulo: "X",
        inicio: "2025-09-05T10:00:00.000-03:00",
        fim: "2025-09-05T11:00:00.000-03:00",
      }),
    ).rejects.toBeInstanceOf(FalhaDoCalendario);
    await expect(calendario.cancelar(idVisivel)).rejects.toBeInstanceOf(
      FalhaDoCalendario,
    );
  });

  it("propaga indisponibilidade como FalhaDoCalendario", async () => {
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        throw new FalhaDoCalendario();
      },
      async listarEventos() {
        return [];
      },
      async obterEvento() {
        throw new FalhaDoCalendario();
      },
      async criarEvento() {
        throw new FalhaDoCalendario();
      },
      async alterarEvento() {
        throw new FalhaDoCalendario();
      },
      async cancelarEvento() {
        throw new FalhaDoCalendario();
      },
    });

    await expect(
      calendario.listar({
        inicio: "2025-09-04T00:00:00.000-03:00",
        fim: "2025-09-07T23:59:59.999-03:00",
      }),
    ).rejects.toBeInstanceOf(FalhaDoCalendario);
  });
});

describe("teto de uma página por agenda", () => {
  it("marca truncadoAte quando a agenda devolve 500 eventos", async () => {
    const eventos = Array.from({ length: 500 }, (_, i) => ({
      id: `e${i}`,
      summary: "Reunião",
      start: { dateTime: `2026-03-01T10:00:00-03:00` },
      end: { dateTime: `2026-03-01T11:00:00-03:00` },
    }));
    eventos[499] = {
      id: "ultimo",
      summary: "Reunião",
      start: { dateTime: "2026-06-15T10:00:00-03:00" },
      end: { dateTime: "2026-06-15T11:00:00-03:00" },
    };
    const calendario = criarCalendarioGoogle({
      async listarAgendas() {
        return [{ id: "primary", summary: "Principal", primary: true, selected: true }];
      },
      async listarEventos() {
        return eventos;
      },
      async obterEvento() {
        throw new Error("não obter");
      },
      async criarEvento() {
        throw new Error("não criar");
      },
      async alterarEvento() {
        throw new Error("não alterar");
      },
      async cancelarEvento() {
        throw new Error("não cancelar");
      },
    });
    const detalhada = await calendario.listarDetalhado!({
      inicio: "2026-01-01T00:00:00.000-03:00",
      fim: "2026-12-31T23:59:59.999-03:00",
    });
    expect(detalhada.compromissos).toHaveLength(500);
    expect(detalhada.truncadoAte).toBe("2026-06-15");
  });
});

describe("Pontual no formato do Google", () => {
  it("envia dateTime no fuso de Brasília", () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15 },
      { zone: FUSO_DONO },
    );
    const evento = pontualParaEventoGoogle(
      "Reunião com a Ana",
      inicio.toISO()!,
      inicio.plus({ hours: 1 }).toISO()!,
    );
    expect(evento.start.timeZone).toBe(FUSO_DONO);
    expect(evento.end.timeZone).toBe(FUSO_DONO);
    expect(evento.start.dateTime).toContain("T15:00");
  });
});
