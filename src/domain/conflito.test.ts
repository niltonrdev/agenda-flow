import { compromissosEmConflito } from "./conflito";
import { FUSO_DONO } from "./fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const quinze = DateTime.fromObject(
  { year: 2025, month: 11, day: 15, hour: 15 },
  { zone: FUSO_DONO },
);

describe("Alerta de conflito", () => {
  it("Pontuais no mesmo horário conflitam; os que só se encostam não", () => {
    const existente = {
      id: "a",
      titulo: "Reunião com a Ana",
      tipo: "pontual" as const,
      inicio: quinze.toISO()!,
      fim: quinze.plus({ hours: 1 }).toISO()!,
    };

    const porCima = compromissosEmConflito(
      {
        tipo: "pontual",
        titulo: "Outra",
        inicio: quinze.toISO()!,
        fim: quinze.plus({ hours: 1 }).toISO()!,
      },
      [existente],
    );
    expect(porCima).toEqual([existente]);

    const encostado = compromissosEmConflito(
      {
        tipo: "pontual",
        titulo: "Depois",
        inicio: quinze.plus({ hours: 1 }).toISO()!,
        fim: quinze.plus({ hours: 2 }).toISO()!,
      },
      [existente],
    );
    expect(encostado).toEqual([]);
  });

  it("ignora o próprio Compromisso na Alteração", () => {
    const pescaria = {
      id: "p",
      titulo: "Pescaria",
      tipo: "periodo" as const,
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    };
    expect(
      compromissosEmConflito(
        {
          tipo: "periodo",
          titulo: "Pescaria",
          primeiroDia: "2025-09-05",
          ultimoDia: "2025-09-07",
        },
        [pescaria],
        "p",
      ),
    ).toEqual([]);
  });
});
