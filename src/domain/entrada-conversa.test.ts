import {
  compromissosDeDemonstracao,
  criarCalendarioEmMemoria,
} from "@/adapters/calendario-em-memoria";
import { processarTurno } from "@/domain/entrada-conversa";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

/** Agora explícito: nenhum teste depende do dia em que a suíte roda. */
const AGORA = DateTime.fromObject(
  { year: 2025, month: 8, day: 1, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

describe("entrada de conversa — Consulta de um dia", () => {
  it("uma data solta sem Compromisso responde que o dia está livre", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "15 de outubro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe("15 de outubro está livre.");
    expect(calendario.listarTodos()).toHaveLength(3);
  });

  it("um dia ocupado lista cada Compromisso com título e horário", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "15 de novembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("16h");
    expect(saida.texto).toMatch(/15 de novembro/i);
  });

  it("um Período que cobre o dia consultado aparece na resposta desse dia", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "7 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("Cirurgia");
    expect(saida.texto).toMatch(/7 de setembro/i);
  });

  it("mensagem que o interpretador não entende recebe resposta dizendo isso, e nada é gravado", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "blá blá xyz", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/não entendi/i);
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("datas são interpretadas em America/Sao_Paulo a partir do agora passado", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const agoraTarde = DateTime.fromObject(
      { year: 2025, month: 11, day: 20, hour: 18, minute: 0 },
      { zone: FUSO_DONO },
    );

    const saida = await processarTurno(
      { mensagem: "15 de novembro", agora: agoraTarde },
      calendario,
    );

    // 15/11/2025 já passou → cai em 2026; sem Compromisso → livre
    expect(saida.texto).toBe("15 de novembro está livre.");
  });

  it("depois que o feriado passou, a demonstração ainda mostra a Cirurgia no próximo 7 de setembro", async () => {
    const depoisDoFeriado = DateTime.fromObject(
      { year: 2026, month: 9, day: 11, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(depoisDoFeriado),
    );

    const saida = await processarTurno(
      { mensagem: "7 de setembro", agora: depoisDoFeriado },
      calendario,
    );

    expect(saida.texto).toContain("Cirurgia");
  });
});
