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

describe("entrada de conversa — Marcação de Período", () => {
  it("intervalo de dias produz Confirmação de Período com o primeiro e o último dia, e nada é gravado", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/pescaria/i);
    expect(saida.texto).toMatch(/4 de agosto/);
    expect(saida.texto).toMatch(/7 de agosto/);
    expect(saida.texto).toMatch(/dia inteiro/i);
    expect(saida.texto).not.toMatch(/\d{1,2}h/);
    expect(saida.confirmacaoPendente).toEqual({
      tipo: "periodo",
      titulo: "Pescaria",
      primeiroDia: "2025-08-04",
      ultimoDia: "2025-08-07",
    });
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("o sim grava um único Compromisso de dias inteiros, inclusive nos extremos", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7 de setembro", agora: AGORA },
      calendario,
    );

    const gravado = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(gravado.texto).toMatch(/ficou marcado/i);
    expect(gravado.confirmacaoPendente).toBeNull();

    const todos = calendario.listarTodos();
    const novos = todos.filter((c) => c.titulo === "Pescaria");
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({
      tipo: "periodo",
      titulo: "Pescaria",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });
    expect(novos[0]).not.toHaveProperty("inicio");
    expect(novos[0]).not.toHaveProperty("fim");
  });

  it("consultar qualquer dia coberto encontra o Período, e o dia de fora não", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );
    await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    for (const dia of [4, 5, 6, 7]) {
      const saida = await processarTurno(
        { mensagem: `${dia} de agosto`, agora: AGORA },
        calendario,
      );
      expect(saida.texto).toMatch(/pescaria/i);
    }

    const fora = await processarTurno(
      { mensagem: "3 de agosto", agora: AGORA },
      calendario,
    );
    expect(fora.texto).toBe("3 de agosto está livre.");
  });

  it("consultar o intervalo mostra o Período uma vez só", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );
    await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    const saida = await processarTurno(
      { mensagem: "do dia 4 ao 7", agora: AGORA },
      calendario,
    );

    expect(saida.texto.match(/Pescaria/g)).toHaveLength(1);
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("distingue Pontual de Período pela Mensagem, sem o Dono dizer o tipo", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const periodo = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );
    const pontual = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(periodo.confirmacaoPendente?.tipo).toBe("periodo");
    expect(pontual.confirmacaoPendente).toMatchObject({
      tipo: "pontual",
      titulo: "Reunião com a Ana",
    });
    expect(pontual.texto).toMatch(/15h/);
    expect(pontual.texto).toMatch(/16h/);
    expect(periodo.texto).not.toMatch(/\d{1,2}h/);
    expect(calendario.listarTodos()).toHaveLength(0);
  });
});
