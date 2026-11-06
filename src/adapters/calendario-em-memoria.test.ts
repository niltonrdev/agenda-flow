import {
  criarCalendarioDeDemonstracaoSomenteLeitura,
  criarCalendarioEmMemoria,
  RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA,
} from "@/adapters/calendario-em-memoria";
import { FalhaDoCalendario } from "@/domain/falha-calendario";
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

  it("o calendário de demonstração só consulta o seed", async () => {
    const agora = DateTime.fromObject(
      { year: 2025, month: 8, day: 1, hour: 10 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioDeDemonstracaoSomenteLeitura(agora);
    const listados = await calendario.listar({
      inicio: "2025-09-07T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });
    expect(listados.some((c) => c.titulo === "Cirurgia")).toBe(true);
    await expect(
      calendario.criar({
        tipo: "periodo",
        titulo: "Segredo",
        primeiroDia: "2025-09-08",
        ultimoDia: "2025-09-08",
      }),
    ).rejects.toMatchObject({
      message: RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA,
    });
    await expect(calendario.cancelar("demo-cirurgia")).rejects.toBeInstanceOf(
      FalhaDoCalendario,
    );
  });
});
