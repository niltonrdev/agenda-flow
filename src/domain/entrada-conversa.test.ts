import {
  compromissosDeDemonstracao,
  criarCalendarioEmMemoria,
} from "@/adapters/calendario-em-memoria";
import { processarTurno } from "@/domain/entrada-conversa";
import { FalhaDoCalendario } from "@/domain/falha-calendario";
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

  it("15/10 consulta a próxima data futura em formato numérico", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "15/10", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe("15 de outubro está livre.");
  });

  it("15 de novembro de 2027 não repete o Compromisso de demonstração de 2025", async () => {
    const calendario = criarCalendarioEmMemoria(compromissosDeDemonstracao(AGORA));

    const saida = await processarTurno(
      { mensagem: "15 de novembro de 2027", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toBe("15 de novembro de 2027 está livre.");
    expect(saida.texto).not.toContain("Ana");
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
    expect(saida.texto).toBe("15 de novembro de 2026 está livre.");
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
    expect(saida.texto).toContain("Compromisso gravado");
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

  it("marcar sem horário pede o horário; às 15h e sim gravam", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const pedindo = await processarTurno(
      {
        mensagem: "marcar reunião dia 20 de dezembro com o nilton",
        agora: AGORA,
      },
      calendario,
    );

    expect(pedindo.texto).toMatch(/horário/i);
    expect(pedindo.texto).toMatch(/20 de dezembro/i);
    expect(pedindo.confirmacaoPendente).toMatchObject({
      acao: "completar_marcacao",
      titulo: "Reunião com o nilton",
      dia: "2025-12-20",
    });
    expect(calendario.listarTodos()).toHaveLength(0);

    const proposta = await processarTurno(
      {
        mensagem: "às 15h",
        agora: AGORA,
        confirmacaoPendente: pedindo.confirmacaoPendente,
      },
      calendario,
    );

    expect(proposta.texto).toMatch(/Confirmação/i);
    expect(proposta.texto).toContain("Reunião com o nilton");
    expect(proposta.texto).toContain("15h");
    expect(proposta.confirmacaoPendente).toMatchObject({
      acao: "marcar_pontual",
    });

    const saida = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toContain("Marquei");
    expect(saida.texto).toContain("Compromisso gravado");
    expect(calendario.listarTodos()).toEqual([
      expect.objectContaining({
        tipo: "pontual",
        titulo: "Reunião com o nilton",
      }),
    ]);
  });

  it("aceita 5:30h e 5 da manhã na Marcação", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const colon = await processarTurno(
      {
        mensagem: "marcar viagem com Nilton 29 de novembro as 5:30h",
        agora: AGORA,
      },
      calendario,
    );
    expect(colon.texto).toMatch(/Confirmação/i);
    expect(colon.texto).toContain("5h30");
    expect(colon.confirmacaoPendente).toMatchObject({
      acao: "marcar_pontual",
    });

    const manha = await processarTurno(
      {
        mensagem: "marcar viagem com Nilton 29 de novembro as 5 da manhã",
        agora: AGORA,
      },
      calendario,
    );
    expect(manha.texto).toMatch(/Confirmação/i);
    expect(manha.texto).toMatch(/5h(?!\d)/);
    if (manha.confirmacaoPendente?.acao !== "marcar_pontual") {
      throw new Error("esperava Confirmação de Pontual");
    }
    expect(manha.confirmacaoPendente.inicio).toContain("T05:00");
  });

  it("depois de consultar um dia, marcar então reusa o dia e pede horário", async () => {
    const calendario = criarCalendarioEmMemoria([]);

    const consulta = await processarTurno(
      { mensagem: "20 de dezembro", agora: AGORA },
      calendario,
    );
    expect(consulta.texto).toMatch(/livre/i);
    expect(consulta.ultimoDiaConsultado).toBe("2025-12-20");

    const pedindo = await processarTurno(
      {
        mensagem: "marcar reunião então",
        agora: AGORA,
        ultimoDiaConsultado: consulta.ultimoDiaConsultado,
      },
      calendario,
    );

    expect(pedindo.texto).toMatch(/horário/i);
    expect(pedindo.texto).toMatch(/20 de dezembro/i);
    expect(pedindo.confirmacaoPendente).toMatchObject({
      acao: "completar_marcacao",
      dia: "2025-12-20",
      titulo: "Reunião",
    });
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

describe("entrada de conversa — Alerta de conflito", () => {
  it("Pontual no mesmo horário avisa qual Compromisso conflita e não grava", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 8, day: 2, hour: 15 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "dentista",
        titulo: "Dentista",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/Alerta de conflito/i);
    expect(saida.texto).toContain("Dentista");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).toMatch(/2 de agosto/i);
    expect(saida.confirmacaoPendente).toMatchObject({ acao: "marcar_pontual" });
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("Pontual que cai dentro de um Período gera Alerta de conflito", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "cirurgia",
        titulo: "Cirurgia",
        tipo: "periodo",
        primeiroDia: "2025-08-02",
        ultimoDia: "2025-08-02",
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/Alerta de conflito/i);
    expect(saida.texto).toContain("Cirurgia");
    expect(saida.texto).toMatch(/2 de agosto/i);
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("horários que só se encostam não geram alerta", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 8, day: 2, hour: 14 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "almoco",
        titulo: "Almoço",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    expect(saida.texto).not.toMatch(/Alerta de conflito/i);
    expect(saida.texto).toMatch(/Confirmação/i);
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("depois do aviso, o sim grava mesmo com a sobreposição", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 8, day: 2, hour: 15 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "dentista",
        titulo: "Dentista",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
    ]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    const saida = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(saida.texto).toContain("Marquei");
    expect(calendario.listarTodos()).toHaveLength(2);
    expect(calendario.listarTodos().map((c) => c.titulo)).toContain(
      "Reunião com a Ana",
    );
  });

  it("depois do aviso, sem o sim nada é gravado", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 8, day: 2, hour: 15 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "dentista",
        titulo: "Dentista",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
    ]);
    const antes = calendario.listarTodos();
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
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("marcar a pescaria de 4 a 7 com a cirurgia no dia 7 mostra a cirurgia antes de gravar", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      {
        mensagem: "marcar pescaria do dia 4 ao 7",
        agora: AGORA_SETEMBRO,
      },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toMatch(/Alerta de conflito/i);
    expect(saida.texto).toContain("Cirurgia");
    expect(saida.texto).toMatch(/7 de setembro/i);
    expect(saida.texto).toContain("Pescaria");
    expect(saida.texto).toMatch(/dia inteiro/i);
    expect(saida.confirmacaoPendente).toMatchObject({
      acao: "marcar_periodo",
      titulo: "Pescaria",
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-07",
    });
    expect(calendario.listarTodos()).toEqual(antes);

    const gravado = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: saida.confirmacaoPendente,
      },
      calendario,
    );

    expect(gravado.texto).toMatch(/marquei/i);
    const periodos = calendario
      .listarTodos()
      .filter((c) => c.titulo === "Pescaria" && c.tipo === "periodo");
    expect(periodos).toHaveLength(2);
  });
});

describe("entrada de conversa — Alteração", () => {
  it("pedido de alterar mostra Confirmação do que sai e do que entra, sem gravar", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toMatch(/4 de setembro/);
    expect(saida.texto).toMatch(/6 de setembro/);
    expect(saida.texto).toMatch(/5 de setembro/);
    expect(saida.texto).toMatch(/7 de setembro/);
    expect(saida.confirmacaoPendente?.acao).toBe("alterar_periodo");
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("Alteração de Pontual muda só a data, só o horário, ou os dois", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "ana",
        titulo: "Reunião com a Ana",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const soData = await processarTurno(
      {
        mensagem: "muda a reunião com a Ana para o dia 16",
        agora: AGORA,
      },
      calendario,
    );
    expect(soData.texto).toMatch(/16 de novembro/);
    expect(soData.texto).toMatch(/15h/);
    expect(soData.texto).toMatch(/16h/);
    expect(soData.confirmacaoPendente?.acao).toBe("alterar_pontual");

    const soHora = await processarTurno(
      {
        mensagem: "muda a reunião com a Ana para as 10h",
        agora: AGORA,
      },
      calendario,
    );
    expect(soHora.texto).toMatch(/15 de novembro/);
    expect(soHora.texto).toMatch(/10h/);
    expect(soHora.texto).toMatch(/11h/);

    const osDois = await processarTurno(
      {
        mensagem: "muda a reunião com a Ana para o dia 16 às 10h",
        agora: AGORA,
      },
      calendario,
    );
    expect(osDois.texto).toMatch(/16 de novembro/);
    expect(osDois.texto).toMatch(/10h/);
    expect(osDois.texto).toMatch(/11h/);
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("Alteração de Período muda o primeiro dia, o último, ou os dois, em dias inteiros", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "pescaria",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-04",
        ultimoDia: "2025-09-07",
      },
    ]);

    const primeiro = await processarTurno(
      {
        mensagem: "muda a pescaria a partir do dia 3",
        agora: AGORA_SETEMBRO,
      },
      calendario,
    );
    expect(primeiro.texto).toMatch(/3 de setembro/);
    expect(primeiro.texto).toMatch(/7 de setembro/);
    expect(primeiro.texto).toMatch(/dia inteiro/i);
    expect(primeiro.texto).not.toMatch(/\d{1,2}h/);

    const ultimo = await processarTurno(
      {
        mensagem: "muda a pescaria até o dia 8",
        agora: AGORA_SETEMBRO,
      },
      calendario,
    );
    expect(ultimo.texto).toMatch(/4 de setembro/);
    expect(ultimo.texto).toMatch(/8 de setembro/);

    const osDois = await processarTurno(
      {
        mensagem: "muda a pescaria para o dia 5 ao 9",
        agora: AGORA_SETEMBRO,
      },
      calendario,
    );
    expect(osDois.texto).toMatch(/5 de setembro/);
    expect(osDois.texto).toMatch(/9 de setembro/);
    expect(calendario.listarTodos()).toHaveLength(1);
  });

  it("pedido que casa com mais de um Compromisso lista os candidatos", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "p1",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-04",
        ultimoDia: "2025-09-06",
      },
      {
        id: "p2",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-12",
        ultimoDia: "2025-09-14",
      },
    ]);

    const saida = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toMatch(/mais de um/i);
    expect(saida.texto).toMatch(/4 de setembro/);
    expect(saida.texto).toMatch(/12 de setembro/);
    expect(saida.confirmacaoPendente?.acao).toBe("escolher_alteracao");
    expect(calendario.listarTodos()).toHaveLength(2);
  });

  it("o Dono escolhe da lista pelo que ela mostra e recebe a Confirmação daquele Compromisso", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "p1",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-04",
        ultimoDia: "2025-09-06",
      },
      {
        id: "p2",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-12",
        ultimoDia: "2025-09-14",
      },
    ]);

    const lista = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    const escolha = await processarTurno(
      {
        mensagem: "a de 12 de setembro",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: lista.confirmacaoPendente,
      },
      calendario,
    );

    expect(escolha.texto).toMatch(/Confirmação/i);
    expect(escolha.texto).toMatch(/12 de setembro/);
    expect(escolha.texto).toMatch(/14 de setembro/);
    expect(escolha.texto).toMatch(/5 de setembro/);
    expect(escolha.texto).toMatch(/7 de setembro/);
    expect(escolha.confirmacaoPendente?.acao).toBe("alterar_periodo");
    expect(calendario.listarTodos()).toHaveLength(2);
  });

  it("pedido que não casa com nenhum Compromisso diz que não foi encontrado", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "muda o jantar para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toMatch(/não (foi )?encontr/i);
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("destino que se sobrepõe a outro Compromisso traz Alerta de conflito na Confirmação", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );

    const saida = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toMatch(/Alerta de conflito/i);
    expect(saida.texto).toMatch(/Cirurgia/);
    expect(saida.texto).toMatch(/7 de setembro/);
    expect(calendario.listarTodos()).toHaveLength(3);
  });

  it("só o sim grava a Alteração; o não pergunta o que mudar e a correção reapresenta a Confirmação", async () => {
    const calendario = criarCalendarioEmMemoria([
      {
        id: "pescaria",
        titulo: "Pescaria",
        tipo: "periodo",
        primeiroDia: "2025-09-04",
        ultimoDia: "2025-09-06",
      },
    ]);

    const proposta = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );
    expect(calendario.listarTodos()[0]).toMatchObject({
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    });

    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );
    expect(recusa.texto).toMatch(/o que mudar/i);
    expect(calendario.listarTodos()[0]).toMatchObject({
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    });

    const correcao = await processarTurno(
      {
        mensagem: "até o dia 8",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: recusa.confirmacaoPendente,
      },
      calendario,
    );
    expect(correcao.texto).toMatch(/Confirmação/i);
    expect(correcao.texto).toMatch(/5 de setembro/);
    expect(correcao.texto).toMatch(/8 de setembro/);
    expect(calendario.listarTodos()[0]).toMatchObject({
      primeiroDia: "2025-09-04",
      ultimoDia: "2025-09-06",
    });

    const gravado = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: correcao.confirmacaoPendente,
      },
      calendario,
    );
    expect(gravado.texto).toMatch(/alterei/i);
    expect(gravado.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toEqual([
      expect.objectContaining({
        tipo: "periodo",
        titulo: "Pescaria",
        primeiroDia: "2025-09-05",
        ultimoDia: "2025-09-08",
      }),
    ]);
  });

  it("o sim depois do Alerta de conflito grava a Alteração mesmo com a sobreposição", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const proposta = await processarTurno(
      { mensagem: "muda a pescaria para o dia 5", agora: AGORA_SETEMBRO },
      calendario,
    );

    const gravado = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(gravado.texto).toMatch(/alterei/i);
    const pescaria = calendario
      .listarTodos()
      .find((c) => c.titulo === "Pescaria");
    expect(pescaria).toMatchObject({
      tipo: "periodo",
      primeiroDia: "2025-09-05",
      ultimoDia: "2025-09-07",
    });
  });
});

describe("entrada de conversa — Cancelamento", () => {
  it("pedido de cancelar produz Confirmação identificando o Compromisso, com dia e horário", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "cancela a reunião da Ana", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toMatch(/Reunião com a Ana/);
    expect(saida.texto).toMatch(/15 de novembro/);
    expect(saida.texto).toMatch(/15h/);
    expect(saida.texto).toMatch(/16h/);
    expect(saida.confirmacaoPendente?.acao).toBe("cancelar_pontual");
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("o sim remove o Compromisso do Calendário e a Conversa avisa", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA),
    );

    const proposta = await processarTurno(
      { mensagem: "cancela a reunião da Ana", agora: AGORA },
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

    expect(gravado.texto).toMatch(/cancelei/i);
    expect(gravado.texto).toMatch(/Reunião com a Ana/);
    expect(gravado.confirmacaoPendente).toBeNull();
    expect(
      calendario.listarTodos().some((c) => c.titulo === "Reunião com a Ana"),
    ).toBe(false);
  });

  it("o não deixa o Compromisso intacto", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA),
    );
    const antes = calendario.listarTodos();

    const proposta = await processarTurno(
      { mensagem: "cancela a reunião da Ana", agora: AGORA },
      calendario,
    );
    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(recusa.texto).toMatch(/o que mudar/i);
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("pedido ambíguo lista os candidatos e o Dono escolhe pelo que a lista mostra", async () => {
    const inicio = DateTime.fromObject(
      { year: 2025, month: 11, day: 14, hour: 10 },
      { zone: FUSO_DONO },
    );
    const outro = DateTime.fromObject(
      { year: 2025, month: 11, day: 15, hour: 15 },
      { zone: FUSO_DONO },
    );
    const calendario = criarCalendarioEmMemoria([
      {
        id: "sexta",
        titulo: "Reunião com a Ana",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: inicio.plus({ hours: 1 }).toISO()!,
      },
      {
        id: "sabado",
        titulo: "Reunião com a Ana",
        tipo: "pontual",
        inicio: outro.toISO()!,
        fim: outro.plus({ hours: 1 }).toISO()!,
      },
    ]);

    const lista = await processarTurno(
      { mensagem: "cancela a reunião da Ana", agora: AGORA },
      calendario,
    );

    expect(lista.texto).toMatch(/mais de um/i);
    expect(lista.texto).toMatch(/14 de novembro/);
    expect(lista.texto).toMatch(/15 de novembro/);
    expect(lista.confirmacaoPendente?.acao).toBe("escolher_cancelamento");
    expect(calendario.listarTodos()).toHaveLength(2);

    const escolha = await processarTurno(
      {
        mensagem: "a de 14 de novembro",
        agora: AGORA,
        confirmacaoPendente: lista.confirmacaoPendente,
      },
      calendario,
    );

    expect(escolha.texto).toMatch(/Confirmação/i);
    expect(escolha.texto).toMatch(/14 de novembro/);
    expect(escolha.texto).not.toMatch(/15 de novembro/);
    expect(escolha.confirmacaoPendente?.acao).toBe("cancelar_pontual");
    expect(calendario.listarTodos()).toHaveLength(2);
  });

  it("pedido que não casa com nenhum Compromisso diz que não foi encontrado", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "cancela o jantar", agora: AGORA },
      calendario,
    );

    expect(saida.texto).toMatch(/não (foi )?encontr/i);
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("cancelar um Período remove o Compromisso inteiro", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );

    const proposta = await processarTurno(
      { mensagem: "cancela a pescaria", agora: AGORA_SETEMBRO },
      calendario,
    );
    expect(proposta.texto).toMatch(/Confirmação/i);
    expect(proposta.texto).toMatch(/4 de setembro/);
    expect(proposta.texto).toMatch(/6 de setembro/);
    expect(proposta.confirmacaoPendente?.acao).toBe("cancelar_periodo");

    const gravado = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA_SETEMBRO,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(gravado.texto).toMatch(/cancelei/i);
    expect(
      calendario.listarTodos().some((c) => c.titulo === "Pescaria"),
    ).toBe(false);
  });

  it("pedido de tirar só um dia de um Período responde que isso é Alteração dos extremos, e não remove nada", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA_SETEMBRO),
    );
    const antes = calendario.listarTodos();

    const saida = await processarTurno(
      { mensagem: "tira o dia 5 da pescaria", agora: AGORA_SETEMBRO },
      calendario,
    );

    expect(saida.texto).toMatch(/Alteração dos extremos/i);
    expect(saida.confirmacaoPendente).toBeNull();
    expect(calendario.listarTodos()).toEqual(antes);
  });

  it("depois de cancelado, consultar o dia não mostra mais o Compromisso", async () => {
    const calendario = criarCalendarioEmMemoria(
      compromissosDeDemonstracao(AGORA),
    );

    const proposta = await processarTurno(
      { mensagem: "cancela a reunião da Ana", agora: AGORA },
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
      { mensagem: "15 de novembro", agora: AGORA },
      calendario,
    );

    expect(consulta.texto).toMatch(/livre/i);
    expect(consulta.texto).not.toMatch(/Ana/);
  });
});

describe("entrada de conversa — Calendário indisponível", () => {
  it("diz em português que não foi gravado quando o Calendário falha no sim", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      { mensagem: "reunião com a Ana amanhã às 15h", agora: AGORA },
      calendario,
    );

    const falho: typeof calendario = {
      ...calendario,
      async criar() {
        throw new FalhaDoCalendario();
      },
    };

    const saida = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      falho,
    );

    expect(saida.texto).toMatch(/não foi gravado/i);
    expect(saida.confirmacaoPendente).toEqual(proposta.confirmacaoPendente);
  });
});

