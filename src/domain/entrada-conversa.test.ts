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

describe("entrada de conversa — Marcação de Pontual", () => {
  it("a Mensagem de marcar produz uma Confirmação com título, data e horário, e não grava", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("2 de agosto");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("16h");
    expect(saida.confirmacaoPendente).toMatchObject({
      acao: "marcar_pontual",
      titulo: "Reunião com a Ana",
    });
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("Pontual sem duração termina uma hora depois do início", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const saida = await processarTurno(
      { mensagem: "dentista amanhã às 9h", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toContain("9h");
    expect(saida.texto).toContain("10h");
    const proposta = saida.confirmacaoPendente;
    if (proposta?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(proposta.inicio).toContain("T09:00");
    expect(proposta.fim).toContain("T10:00");
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("duração dita das 15h às 16h30 é respeitada", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const saida = await processarTurno(
      {
        mensagem: "reunião com a Ana amanhã das 15h às 16h30",
        agora: AGORA,
      },
      calendario,
    );

    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("16h30");
    const proposta = saida.confirmacaoPendente;
    if (proposta?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(proposta.fim).toContain("T16:30");
  });

  it("duração dita por 30 minutos é respeitada", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const saida = await processarTurno(
      {
        mensagem: "reunião com a Ana amanhã às 15h por 30 minutos",
        agora: AGORA,
      },
      calendario,
    );

    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("15h30");
    const proposta = saida.confirmacaoPendente;
    if (proposta?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(proposta.fim).toContain("T15:30");
  });

  it("o sim grava o Compromisso e a Conversa avisa que ficou marcado", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );
    expect(calendario.listarTodos()).toHaveLength(0);

    const saida = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toContain("Marquei");
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.confirmacaoPendente).toBeNull();
    const pendente = proposta.confirmacaoPendente;
    if (pendente?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(calendario.listarTodos()).toEqual([
      expect.objectContaining({
        tipo: "pontual",
        titulo: "Reunião com a Ana",
        inicio: pendente.inicio,
        fim: pendente.fim,
      }),
    ]);
  });

  it("a Confirmação pendente só vale se o turno a trouxer; sem ela o sim não grava", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    const saida = await processarTurno(
      { mensagem: "sim", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/não entendi/i);
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("outro pedido no lugar do sim descarta a proposta e atende o pedido novo", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "15 de outubro",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toBe("15 de outubro está livre.");
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("depois de gravado, consultar aquele dia mostra o Compromisso novo", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
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

    const consulta = await processarTurno(
      { mensagem: "2 de agosto", agora: AGORA },
      calendario,
    );

    expect(consulta.texto).toContain("Reunião com a Ana");
    expect(consulta.texto).toContain("15h");
    expect(consulta.texto).toContain("16h");
    expect(consulta.texto).toMatch(/2 de agosto/i);
  });
});

describe("entrada de conversa — Marcação de Período", () => {
  it("marcar um intervalo produz Confirmação de Período com o primeiro e o último dia, e nada é gravado", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "marcar pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/pescaria/i);
    expect(saida.texto).toMatch(/4 de agosto/);
    expect(saida.texto).toMatch(/7 de agosto/);
    expect(saida.texto).toMatch(/dia inteiro/i);
    expect(saida.texto).not.toMatch(/\d{1,2}h/);
    expect(saida.confirmacaoPendente).toEqual({
      acao: "marcar_periodo",
      titulo: "Pescaria",
      primeiroDia: "2025-08-04",
      ultimoDia: "2025-08-07",
    });
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("o sim grava um único Compromisso de dias inteiros, inclusive nos extremos", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "marcar pescaria do dia 4 ao 7 de setembro", agora: AGORA },
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

    expect(gravado.texto).toMatch(/marquei/i);
    expect(gravado.confirmacaoPendente).toBeNull();

    const novos = calendario.listarTodos().filter((c) => c.titulo === "Pescaria");
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
      { mensagem: "marcar pescaria do dia 4 ao 7", agora: AGORA },
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
      { mensagem: "marcar pescaria do dia 4 ao 7", agora: AGORA },
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
      { mensagem: "marcar pescaria do dia 4 ao 7", agora: AGORA },
      calendario,
    );
    const pontual = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(periodo.confirmacaoPendente?.acao).toBe("marcar_periodo");
    expect(pontual.confirmacaoPendente?.acao).toBe("marcar_pontual");
    expect(pontual.texto).toMatch(/15h/);
    expect(pontual.texto).toMatch(/16h/);
    expect(periodo.texto).toMatch(/dia inteiro/i);
    expect(periodo.texto).not.toMatch(/\d{1,2}h/);
    expect(calendario.listarTodos()).toHaveLength(0);
  });
});

describe("entrada de conversa — Não na Confirmação", () => {
  async function proporPontual() {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );
    return { calendario, proposta };
  }

  it("o não na Confirmação pergunta o que mudar e não descarta a proposta", async () => {
    const { calendario, proposta } = await proporPontual();

    const saida = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toMatch(/o que mudar/i);
    expect(saida.confirmacaoPendente).toMatchObject({
      acao: "marcar_pontual",
      titulo: "Reunião com a Ana",
    });
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("corrigir só a data reapresenta a Confirmação com título e horário preservados", async () => {
    const { calendario, proposta } = await proporPontual();
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "é dia 5",
        agora: AGORA,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("5 de agosto");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("16h");
    expect(saida.texto).not.toContain("2 de agosto");
    expect(calendario.listarTodos()).toHaveLength(0);
    const pendente = saida.confirmacaoPendente;
    if (pendente?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(pendente.inicio).toContain("2025-08-05T15:00");
    expect(pendente.fim).toContain("2025-08-05T16:00");
  });

  it("corrigir só o horário reapresenta a Confirmação com título e data preservados", async () => {
    const { calendario, proposta } = await proporPontual();
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "às 16h",
        agora: AGORA,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("2 de agosto");
    expect(saida.texto).toContain("16h");
    expect(saida.texto).toContain("17h");
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("corrigir só o título reapresenta a Confirmação com data e horário preservados", async () => {
    const { calendario, proposta } = await proporPontual();
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "almoço com a Ana",
        agora: AGORA,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toContain("Almoço com a Ana");
    expect(saida.texto).toContain("2 de agosto");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).toContain("16h");
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("duas correções seguidas partem cada uma da proposta já corrigida", async () => {
    const { calendario, proposta } = await proporPontual();
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );
    const dataCorrigida = await processarTurno(
      {
        mensagem: "é dia 5",
        agora: AGORA,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );
    const recusaDeNovo = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: dataCorrigida.confirmacaoPendente,
      },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "às 16h",
        agora: AGORA,
        confirmacaoPendente: recusaDeNovo.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("5 de agosto");
    expect(saida.texto).toContain("16h");
    expect(saida.texto).toContain("17h");
    expect(calendario.listarTodos()).toHaveLength(0);
  });

  it("nada é gravado durante as correções; o sim grava o Compromisso corrigido", async () => {
    const { calendario, proposta } = await proporPontual();
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );
    const corrigida = await processarTurno(
      {
        mensagem: "é dia 5",
        agora: AGORA,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );
    expect(calendario.listarTodos()).toHaveLength(0);

    const saida = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: corrigida.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toContain("Marquei");
    expect(saida.texto).toContain("5 de agosto");
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.confirmacaoPendente).toBeNull();
    const pendente = corrigida.confirmacaoPendente;
    if (pendente?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(calendario.listarTodos()).toEqual([
      expect.objectContaining({
        tipo: "pontual",
        titulo: "Reunião com a Ana",
        inicio: pendente.inicio,
        fim: pendente.fim,
      }),
    ]);
    expect(pendente.inicio).toContain("2025-08-05");
  });
});

