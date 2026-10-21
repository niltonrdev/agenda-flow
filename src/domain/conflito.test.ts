import { compromissosEmConflito } from "@/domain/conflito";
import type { Compromisso } from "@/domain/compromisso";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

function pontual(
  id: string,
  titulo: string,
  inicio: DateTime,
  fim: DateTime,
): Compromisso {
  return {
    id,
    titulo,
    tipo: "pontual",
    inicio: inicio.toISO()!,
    fim: fim.toISO()!,
  };
}

const dia = (iso: string, hora = 15, minuto = 0) =>
  DateTime.fromISO(iso, { zone: FUSO_DONO }).set({
    hour: hora,
    minute: minuto,
    second: 0,
    millisecond: 0,
  });

describe("Alerta de conflito", () => {
  it("Pontual que se sobrepõe a outro Pontual no mesmo horário conflita", () => {
    const existente = pontual(
      "ana",
      "Reunião com a Ana",
      dia("2025-08-02", 15),
      dia("2025-08-02", 16),
    );

    const conflitos = compromissosEmConflito(
      {
        tipo: "pontual",
        inicio: dia("2025-08-02", 15, 30).toISO()!,
        fim: dia("2025-08-02", 16, 30).toISO()!,
      },
      [existente],
    );

    expect(conflitos).toEqual([existente]);
  });

  it("Pontual que cai dentro de um Período conflita", () => {
    const cirurgia: Compromisso = {
      id: "cirurgia",
      titulo: "Cirurgia",
      tipo: "periodo",
      primeiroDia: "2025-09-07",
      ultimoDia: "2025-09-07",
    };

    const conflitos = compromissosEmConflito(
      {
        tipo: "pontual",
        inicio: dia("2025-09-07", 10).toISO()!,
        fim: dia("2025-09-07", 11).toISO()!,
      },
      [cirurgia],
    );

    expect(conflitos).toEqual([cirurgia]);
  });

  it("Período que compartilha ao menos um dia com outro Período conflita", () => {
    const cirurgia: Compromisso = {
      id: "cirurgia",
      titulo: "Cirurgia",
      tipo: "periodo",
      primeiroDia: "2025-09-07",
      ultimoDia: "2025-09-07",
    };

    const conflitos = compromissosEmConflito(
      {
        tipo: "periodo",
        primeiroDia: "2025-09-04",
        ultimoDia: "2025-09-07",
      },
      [cirurgia],
    );

    expect(conflitos).toEqual([cirurgia]);
  });

  it("Compromissos que apenas se encostam não conflitam", () => {
    const existente = pontual(
      "ana",
      "Reunião com a Ana",
      dia("2025-08-02", 14),
      dia("2025-08-02", 15),
    );

    const conflitos = compromissosEmConflito(
      {
        tipo: "pontual",
        inicio: dia("2025-08-02", 15).toISO()!,
        fim: dia("2025-08-02", 16).toISO()!,
      },
      [existente],
    );

    expect(conflitos).toEqual([]);
  });

  it("Períodos em dias vizinhos, sem dia em comum, não conflitam", () => {
    const pescaria: Compromisso = {
      id: "pescaria",
      titulo: "Pescaria",
      tipo: "periodo",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    };

    const conflitos = compromissosEmConflito(
      {
        tipo: "periodo",
        primeiroDia: "2025-09-07",
        ultimoDia: "2025-09-07",
      },
      [pescaria],
    );

    expect(conflitos).toEqual([]);
  });
});
