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

/** 1º de setembro de 2025: "do dia 4 ao 7" cai no recorte da pescaria. */
const AGORA_SETEMBRO = DateTime.fromObject(
  { year: 2025, month: 9, day: 1, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

describe("entrada de conversa — Consulta de intervalo", () => {
  it("pescaria do dia 4 ao 7 consulta os quatro dias e mostra a Cirurgia semeada no dia 7", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "pescaria do dia 4 ao 7", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toBe(
      [
        "De 4 a 7 de setembro:",
        "• Pescaria, de 4 de setembro a 6 de setembro",
        "• Cirurgia, 7 de setembro",
      ].join("\n"),
    );
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("fala de feriado com data consulta o intervalo do recorte, não só o dia", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "feriado de 7 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("Pescaria");
    expect(saida.texto).toContain("Cirurgia");
    expect(saida.texto).toMatch(/6 de setembro/);
    expect(saida.texto).toMatch(/7 de setembro/);
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("fala de viagem com datas consulta o intervalo correspondente", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const saida = await processarTurno(
      { mensagem: "viagem do dia 10 ao 12 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe("De 10 a 12 de setembro está livre.");
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("esse fim de semana consulta sábado e domingo", async () => {
    const sexta = DateTime.fromObject(
      { year: 2025, month: 11, day: 14, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );
    const ana = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15, minute: 0 },
      { zone: FUSO_DONO },
    );
    const almoco = DateTime.fromObject(
      { year: 2025, month: 11, day: 16, hour: 12, minute: 0 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "ana",
        titulo: "Reunião com a Ana",
        tipo: "pontual",
        inicio: ana.toISO()!,
        fim: ana.plus({ hours: 1 }).toISO()!,
      },
      {
        id: "almoco",
        titulo: "Almoço da família",
        tipo: "pontual",
        inicio: almoco.toISO()!,
        fim: almoco.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "esse fim de semana", agora: sexta },
      calendario,
    );

    expect(saida.texto).toBe(
      [
        "De 15 a 16 de novembro:",
        "• Reunião com a Ana, 15h–16h, 15 de novembro",
        "• Almoço da família, 12h–13h, 16 de novembro",
      ].join("\n"),
    );
    expect(calendario.listarTodos()).toHaveLength(2);
  });

  it("data solta continua consultando apenas aquele dia, sem alargar para o fim de semana", async () => {
    const sexta = DateTime.fromObject(
      { year: 2025, month: 11, day: 14, hour: 10, minute: 0 },
      { zone: FUSO_DONO },
    );
    const ana = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15, minute: 0 },
      { zone: FUSO_DONO },
    );
    const almoco = DateTime.fromObject(
      { year: 2025, month: 11, day: 16, hour: 12, minute: 0 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "ana",
        titulo: "Reunião com a Ana",
        tipo: "pontual",
        inicio: ana.toISO()!,
        fim: ana.plus({ hours: 1 }).toISO()!,
      },
      {
        id: "almoco",
        titulo: "Almoço da família",
        tipo: "pontual",
        inicio: almoco.toISO()!,
        fim: almoco.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "15 de novembro", agora: sexta },
      calendario,
    );

    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).not.toContain("Almoço da família");
    expect(saida.texto).not.toMatch(/16 de novembro/);
    expect(calendario.listarTodos()).toHaveLength(2);
  });

  it("7 de setembro solto não inclui a Pescaria que termina no sábado", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "7 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("Cirurgia");
    expect(saida.texto).not.toContain("Pescaria");
  });

  it("intervalo sem nenhum Compromisso responde que está livre, e nada é gravado", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "do dia 20 ao 22 de outubro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe("De 20 a 22 de outubro está livre.");
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("intervalo ocupado lista os Compromissos com o dia de cada um", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "do dia 4 ao 7 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("Pescaria, de 4 de setembro a 6 de setembro");
    expect(saida.texto).toContain("Cirurgia, 7 de setembro");
  });

  it("um Período que começa antes ou termina depois do recorte aparece na resposta", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "congresso",
        titulo: "Congresso",
        tipo: "periodo",
        primeiroDia: "2025-09-01",
        ultimoDia: "2025-09-10",
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "do dia 4 ao 7 de setembro", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe(
      [
        "De 4 a 7 de setembro:",
        "• Congresso, de 1 de setembro a 10 de setembro",
      ].join("\n"),
    );
    expect(calendario.listarTodos()).toHaveLength(1);
  });
});

