import {
  aplicarToqueNoDia,
  celulasDoMes,
  diaEstaNoIntervalo,
  extremosDaSelecao,
  mensagemDoIntervalo,
} from "@/lib/seletor-dias";
import { describe, expect, it } from "vitest";

describe("seletor de dias do Período", () => {
  it("a grade de novembro de 2026 começa no domingo anterior e tem 42 células", () => {
    const celulas = celulasDoMes(2026, 11);
    expect(celulas).toHaveLength(42);
    expect(celulas[0]).toMatchObject({ iso: "2026-11-01", foraDoMes: false });
    expect(celulas[9]).toMatchObject({ iso: "2026-11-10", diaDoMes: 10 });
  });

  it("primeiro toque escolhe o início; segundo fecha o intervalo mesmo à esquerda", () => {
    const aposPrimeiro = aplicarToqueNoDia(null, "2026-11-10");
    expect(aposPrimeiro).toEqual({ inicio: "2026-11-10" });
    expect(aplicarToqueNoDia(aposPrimeiro, "2026-11-07")).toEqual({
      inicio: "2026-11-07",
      fim: "2026-11-10",
    });
    expect(extremosDaSelecao({ inicio: "2026-11-07" })).toEqual({
      primeiroDia: "2026-11-07",
      ultimoDia: "2026-11-07",
    });
  });

  it("marca os dias inclusive e formata o intervalo para a Conversa", () => {
    expect(diaEstaNoIntervalo("2026-11-08", "2026-11-07", "2026-11-10")).toBe(
      true,
    );
    expect(diaEstaNoIntervalo("2026-11-11", "2026-11-07", "2026-11-10")).toBe(
      false,
    );
    expect(mensagemDoIntervalo("2026-11-07", "2026-11-10")).toBe(
      "7/11/2026 a 10/11/2026",
    );
    expect(mensagemDoIntervalo("2026-11-07", "2026-11-07")).toBe("7/11/2026");
  });
});
