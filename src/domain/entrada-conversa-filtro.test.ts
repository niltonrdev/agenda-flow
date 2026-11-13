import { criarCalendarioEmMemoria } from "@/adapters/calendario-em-memoria";
import type { Calendario } from "@/domain/calendario";
import type { Compromisso } from "@/domain/compromisso";
import { processarTurno } from "@/domain/entrada-conversa";
import { FUSO_DONO } from "@/domain/fuso";
import { ESCOPOS_OAUTH } from "@/lib/google-oauth";
import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";

const AGORA = DateTime.fromObject(
  { year: 2026, month: 11, day: 13, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

function pontual(
  id: string,
  titulo: string,
  dias: number,
  hora = 10,
  descricao?: string,
): Compromisso {
  const inicio = AGORA.plus({ days: dias }).set({
    hour: hora,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return {
    id,
    titulo,
    tipo: "pontual",
    inicio: inicio.toISO()!,
    fim: inicio.plus({ hours: 1 }).toISO()!,
    ...(descricao ? { descricao } : {}),
  };
}

function periodo(
  id: string,
  titulo: string,
  primeiroDeslocamento: number,
  ultimoDeslocamento: number,
  descricao?: string,
): Compromisso {
  return {
    id,
    titulo,
    tipo: "periodo",
    primeiroDia: AGORA.plus({ days: primeiroDeslocamento }).toISODate()!,
    ultimoDia: AGORA.plus({ days: ultimoDeslocamento }).toISODate()!,
    ...(descricao ? { descricao } : {}),
  };
}

describe("entrada de conversa — filtro por tipo e busca livre", () => {
  it("CA1: Mostrar viagens inclui Voo GRU-REC daqui a 10 dias", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("voo", "Voo GRU-REC", 10, 9),
    ]);
    const saida = await processarTurno(
      { mensagem: "Mostrar viagens", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/^Viagens futuras:/);
    expect(saida.texto).toContain("Voo GRU-REC");
    expect(saida.texto).toContain("9h");
  });

  it("CA2: Quais viagens tenho inclui evento daqui a 200 dias", async () => {
    const calendario = criarCalendarioEmMemoria([
      periodo("sp", "Viagem SP", 200, 202),
    ]);
    const saida = await processarTurno(
      { mensagem: "Quais viagens tenho", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toContain("Viagem SP");
  });

  it("CA3: sem data, evento daqui a 400 dias fica fora do teto de 365", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("longe", "Voo GRU-POA", 400, 8),
    ]);
    const saida = await processarTurno(
      { mensagem: "Mostrar viagens", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toBe("Nenhuma viagem futura.");
    expect(saida.texto).not.toContain("GRU-POA");
  });

  it("CA4: Reunião time não entra em viagens e entra em reuniões", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("time", "Reunião time", 5, 14),
    ]);
    const viagens = await processarTurno(
      { mensagem: "Viagens marcadas", agora: AGORA },
      calendario,
    );
    const reunioes = await processarTurno(
      { mensagem: "Minhas reuniões", agora: AGORA },
      calendario,
    );
    expect(viagens.texto).not.toContain("Reunião time");
    expect(reunioes.texto).toContain("Reunião time");
  });

  it("CA5: Recall de clientes não é reunião", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("recall", "Recall de clientes", 3, 11),
    ]);
    const saida = await processarTurno(
      { mensagem: "Mostrar reuniões", agora: AGORA },
      calendario,
    );
    expect(saida.texto).not.toContain("Recall");
    expect(saida.texto).toBe("Nenhuma reunião futura.");
  });

  it("CA6: tipo não reconhecido sugere viagens, reuniões ou busca", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    for (const mensagem of ["Mostrar aniversários", "Mostrar festas"]) {
      const saida = await processarTurno({ mensagem, agora: AGORA }, calendario);
      expect(saida.texto).toMatch(/Posso mostrar viagens, reuniões ou buscar/);
      expect(saida.texto).not.toMatch(/não entendi/i);
    }
  });

  it("CA7 e CA8: 20 reuniões paginam 15 + e mais 5, depois mostrar mais", async () => {
    const reunioes = Array.from({ length: 20 }, (_, i) =>
      pontual(`r${i}`, "Reunião time", i + 1, 10 + (i % 8)),
    );
    const calendario = criarCalendarioEmMemoria(reunioes);
    const primeira = await processarTurno(
      { mensagem: "Mostrar reuniões", agora: AGORA },
      calendario,
    );
    const linhas = primeira.texto.split("\n").filter((l) => l.startsWith("•"));
    expect(linhas).toHaveLength(15);
    expect(primeira.texto).toMatch(/e mais 5/);
    expect(primeira.confirmacaoPendente).toMatchObject({
      acao: "listagem_paginada",
      filtro: "reunioes",
      offset: 15,
    });

    const segunda = await processarTurno(
      {
        mensagem: "mostrar mais",
        agora: AGORA,
        confirmacaoPendente: primeira.confirmacaoPendente,
      },
      calendario,
    );
    const resto = segunda.texto.split("\n").filter((l) => l.startsWith("•"));
    expect(resto).toHaveLength(5);
    expect(segunda.texto).not.toMatch(/e mais/);
    expect(segunda.confirmacaoPendente).toBeNull();
  });

  it("CA9: mostrar mais sem listagem anterior devolve a dica de uso", async () => {
    const saida = await processarTurno(
      { mensagem: "mostrar mais", agora: AGORA },
      criarCalendarioEmMemoria([]),
    );
    expect(saida.texto).toMatch(/Posso mostrar viagens, reuniões ou buscar/);
  });

  it("CA10: mostrar eventos com dentista casa o título", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("d1", "Dentista Dr. Paulo", 30, 15),
    ]);
    const saida = await processarTurno(
      { mensagem: "mostrar eventos com dentista", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/^Eventos com "dentista":/);
    expect(saida.texto).toContain("Dentista Dr. Paulo");
  });

  it("CA11: eventos com joao ignora acento", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("j1", "Almoço com João Silva", 7, 12),
    ]);
    const saida = await processarTurno(
      { mensagem: "eventos com joao", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toContain("Almoço com João Silva");
  });

  it("CA12: termo vazio ou curto não lista no Calendário", async () => {
    let listagens = 0;
    const calendario: Calendario = {
      async listar() {
        listagens += 1;
        return [];
      },
      async criar() {
        throw new Error("não criar");
      },
      async alterar() {
        throw new Error("não alterar");
      },
      async cancelar() {
        throw new Error("não cancelar");
      },
    };
    const vazio = await processarTurno(
      { mensagem: "eventos com", agora: AGORA },
      calendario,
    );
    const curto = await processarTurno(
      { mensagem: "eventos com a", agora: AGORA },
      calendario,
    );
    expect(vazio.texto).toBe("Com o quê? Ex.: 'eventos com dentista'.");
    expect(curto.texto).toBe("Com o quê? Ex.: 'eventos com dentista'.");
    expect(listagens).toBe(0);
  });

  it("CA13: nenhum evento com o termo", async () => {
    const saida = await processarTurno(
      { mensagem: "eventos com pilates", agora: AGORA },
      criarCalendarioEmMemoria([pontual("x", "Dentista", 4)]),
    );
    expect(saida.texto).toBe(
      'Nenhum evento com "pilates" nos próximos 12 meses.',
    );
  });

  it("CA14: termo e período juntos", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("dez", "Almoço com João", 20, 12),
      pontual("jan", "Almoço com João", 50, 12),
    ]);
    const saida = await processarTurno(
      { mensagem: "eventos com João em dezembro", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/Eventos com "joão" em dezembro:/);
    expect(saida.texto).toContain("Almoço com João");
    const linhas = saida.texto.split("\n").filter((l) => l.startsWith("•"));
    expect(linhas).toHaveLength(1);
  });

  it("CA15: casa descrição, mostra só título/data/hora", async () => {
    const secreto = "dentista na clínica do Recife — NÃO EXIBIR";
    const calendario = criarCalendarioEmMemoria([
      pontual("c1", "Consulta", 8, 16, secreto),
    ]);
    const saida = await processarTurno(
      { mensagem: "eventos com dentista", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toContain("Consulta");
    expect(saida.texto).toContain("16h");
    expect(saida.texto).not.toContain(secreto);
    expect(saida.texto).not.toMatch(/clínica do Recife/i);
  });

  it("CA15b: Mostrar viagens casa palavra na descrição", async () => {
    const descricao = "voo para Recife";
    const calendario = criarCalendarioEmMemoria([
      pontual("c2", "Compromisso", 6, 9, descricao),
    ]);
    const saida = await processarTurno(
      { mensagem: "Mostrar viagens", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toContain("Compromisso");
    expect(saida.texto).not.toContain("Recife");
  });

  it("CA15c e CA15d: descrição não vai à resposta, cookie ou log", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const descricao = "SEGREDO-DESCRICAO-XYZ";
    const calendario = criarCalendarioEmMemoria([
      pontual("c3", "Consulta", 2, 11, descricao),
    ]);
    const saida = await processarTurno(
      { mensagem: "eventos com dentista", agora: AGORA },
      calendario,
    );
    const blob = JSON.stringify(saida);
    expect(blob).not.toContain(descricao);
    expect(JSON.stringify(saida.confirmacaoPendente ?? {})).not.toMatch(
      /descricao|SEGREDO/i,
    );
    expect(log.mock.calls.flat().join(" ")).not.toContain(descricao);
    expect(info.mock.calls.flat().join(" ")).not.toContain(descricao);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(descricao);
    log.mockRestore();
    info.mockRestore();
    warn.mockRestore();
  });

  it("CA16: termo especial é literal e sai escapado", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("html", "Notas <b>finas</b>", 4, 10),
      pontual("regex", "arquivo foo.*bar", 5, 10),
    ]);
    const html = await processarTurno(
      { mensagem: "eventos com <b>", agora: AGORA },
      calendario,
    );
    expect(html.texto).toContain("&lt;b&gt;");
    expect(html.texto).toContain("Notas <b>finas</b>");
    const regex = await processarTurno(
      { mensagem: "eventos com .*", agora: AGORA },
      calendario,
    );
    expect(regex.texto).toContain("foo.*bar");
    expect(regex.texto.split("\n").filter((l) => l.startsWith("•"))).toHaveLength(
      1,
    );
  });

  it("CA17: Consultar amanhã continua consulta do dia", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("a", "Dentista", 1, 15),
    ]);
    const saida = await processarTurno(
      { mensagem: "Consultar amanhã", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/14 de novembro/);
    expect(saida.texto).toContain("Dentista");
    expect(saida.texto).not.toMatch(/^Eventos com/);
  });

  it("CA18: Marcar reunião não vira busca nem listagem", async () => {
    const saida = await processarTurno(
      {
        mensagem: "Marcar reunião com João amanhã às 10h",
        agora: AGORA,
      },
      criarCalendarioEmMemoria([]),
    );
    expect(saida.texto).toMatch(/Confirmação:/);
    expect(saida.texto).toMatch(/Reunião com João/);
    expect(saida.confirmacaoPendente).toMatchObject({ acao: "marcar_pontual" });
  });

  it("CA19: Cancelar reunião com João continua cancelamento", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("j", "Reunião com João", 2, 10),
    ]);
    const saida = await processarTurno(
      { mensagem: "Cancelar reunião com João", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/Confirmação: cancelar/);
    expect(saida.confirmacaoPendente).toMatchObject({
      acao: "cancelar_pontual",
    });
  });

  it("CA20: sim e não numa confirmação pendente continuam confirmação", async () => {
    const calendario = criarCalendarioEmMemoria([]);
    const proposta = await processarTurno(
      {
        mensagem: "Marcar reunião com João amanhã às 10h",
        agora: AGORA,
      },
      calendario,
    );
    const sim = await processarTurno(
      {
        mensagem: "sim",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );
    expect(sim.texto).toMatch(/Marquei/);
    expect(calendario.listarTodos()).toHaveLength(1);

    const outra = await processarTurno(
      {
        mensagem: "Marcar daily amanhã às 11h",
        agora: AGORA,
      },
      calendario,
    );
    const nao = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: outra.confirmacaoPendente,
      },
      calendario,
    );
    expect(nao.texto).toBe("O que mudar?");
    expect(nao.confirmacaoPendente).toMatchObject({
      aguardandoCorrecao: true,
    });
  });

  it("CA21: escopos OAuth não mudam e a listagem não loga o termo", async () => {
    expect(ESCOPOS_OAUTH).toEqual([
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    ]);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await processarTurno(
      { mensagem: "eventos com dentista-secreto", agora: AGORA },
      criarCalendarioEmMemoria([]),
    );
    expect(log.mock.calls.flat().join(" ")).not.toContain("dentista-secreto");
    log.mockRestore();
  });

  it("confirmação pendente tem prioridade sobre a busca", async () => {
    const calendario = criarCalendarioEmMemoria([
      pontual("d", "Dentista", 4),
    ]);
    const proposta = await processarTurno(
      { mensagem: "Marcar reunião amanhã às 10h", agora: AGORA },
      calendario,
    );
    const busca = await processarTurno(
      {
        mensagem: "mostrar eventos com dentista",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );
    expect(busca.confirmacaoPendente).toMatchObject({ acao: "marcar_pontual" });
    expect(busca.texto).not.toContain("Dentista");
  });

  it("demonstração: Mostrar viagens encontra o Voo de exemplo", async () => {
    const { compromissosDeDemonstracao } = await import(
      "@/adapters/calendario-em-memoria"
    );
    const agora = DateTime.fromObject(
      { year: 2025, month: 8, day: 1, hour: 10 },
      { zone: FUSO_DONO },
    );
    const saida = await processarTurno(
      { mensagem: "Mostrar viagens", agora },
      criarCalendarioEmMemoria(compromissosDeDemonstracao(agora)),
    );
    expect(saida.texto).toContain("Voo GRU-REC");
  });

  it("evento em andamento entra na listagem futura", async () => {
    const inicio = AGORA.minus({ minutes: 30 });
    const calendario = criarCalendarioEmMemoria([
      {
        id: "agora",
        titulo: "Reunião time",
        tipo: "pontual",
        inicio: inicio.toISO()!,
        fim: AGORA.plus({ minutes: 30 }).toISO()!,
      },
    ]);
    const saida = await processarTurno(
      { mensagem: "Mostrar reuniões", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toContain("Reunião time");
  });

  it("aviso de teto de 500 quando a agenda corta a página", async () => {
    const calendario: Calendario = {
      async listar() {
        return [pontual("v", "Voo GRU-REC", 10)];
      },
      async listarDetalhado() {
        return {
          compromissos: [pontual("v", "Voo GRU-REC", 10)],
          truncadoAte: "2026-12-01",
        };
      },
      async criar() {
        throw new Error("não criar");
      },
      async alterar() {
        throw new Error("não alterar");
      },
      async cancelar() {
        throw new Error("não cancelar");
      },
    };
    const saida = await processarTurno(
      { mensagem: "Mostrar viagens", agora: AGORA },
      calendario,
    );
    expect(saida.texto).toMatch(/Mostrei até 1 de dezembro/);
    expect(saida.texto).toMatch(/Peça um período/);
  });
});
