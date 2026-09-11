import { criarCalendarioEmMemoria } from "@/adapters/calendario-em-memoria";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

describe("porta Calendário — adaptador em memória", () => {
  it("lista, cria, altera e cancela Compromissos", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const inicio = DateTime.fromObject(
      { year: 2025, month: 3, day: 10, hour: 9 },
      { zone: FUSO_DONO },
    );
    const fim = inicio.plus({ hours: 1 });

    const criado = await calendario.criar({
      titulo: "Dentista",
      tipo: "pontual",
      inicio: inicio.toISO()!,
      fim: fim.toISO()!,
    });

    const listados = await calendario.listar({
      inicio: inicio.startOf("day").toISO()!,
      fim: inicio.endOf("day").toISO()!,
    });
    expect(listados).toHaveLength(1);
    expect(listados[0].titulo).toBe("Dentista");

    const alterado = await calendario.alterar(criado.id, {
      titulo: "Dentista (remarcado)",
    });
    expect(alterado.titulo).toBe("Dentista (remarcado)");

    await calendario.cancelar(criado.id);
    const depois = await calendario.listar({
      inicio: inicio.startOf("day").toISO()!,
      fim: inicio.endOf("day").toISO()!,
    });
    expect(depois).toHaveLength(0);
  });
});
