import { criarCalendarioEmMemoria } from "@/adapters/calendario-em-memoria";
import { criarTranscritorDitadoNativo } from "@/adapters/transcritor-ditado-nativo";
import { processarTurno } from "@/domain/entrada-conversa";
import { FUSO_DONO } from "@/domain/fuso";
import { mensagemAPartirDoCampo } from "@/domain/transcritor";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const AGORA = DateTime.fromObject(
  { year: 2025, month: 8, day: 1, hour: 10, minute: 0 },
  { zone: FUSO_DONO },
);

describe("entrada de conversa — Áudio por ditado", () => {
  it("texto ditado segue o mesmo caminho do texto digitado e produz a mesma Confirmação", async () => {
    const transcritor = criarTranscritorDitadoNativo();
    const ditada = await mensagemAPartirDoCampo(
      transcritor,
      "reunião com a Ana amanhã às 15h",
    );
    const digitada = "reunião com a Ana amanhã às 15h";

    const saidaDitada = await processarTurno(
      { mensagem: ditada, agora: AGORA },
      criarCalendarioEmMemoria([]),
    );
    const saidaDigitada = await processarTurno(
      { mensagem: digitada, agora: AGORA },
      criarCalendarioEmMemoria([]),
    );

    expect(saidaDitada.texto).toBe(saidaDigitada.texto);
    expect(saidaDitada.confirmacaoPendente).toEqual(
      saidaDigitada.confirmacaoPendente,
    );
  });

  it("a Confirmação mostra o Compromisso entendido, nunca a transcrição crua", async () => {
    const transcritor = criarTranscritorDitadoNativo();
    const transcricao = "reunião com a Ana amanhã às 15h";
    const mensagem = await mensagemAPartirDoCampo(transcritor, transcricao);

    const saida = await processarTurno(
      { mensagem, agora: AGORA },
      criarCalendarioEmMemoria([]),
    );

    expect(saida.texto).toMatch(/Confirmação/i);
    expect(saida.texto).toContain("Reunião com a Ana");
    expect(saida.texto).toContain("2 de agosto");
    expect(saida.texto).toContain("15h");
    expect(saida.texto).not.toMatch(/reunião com a Ana amanhã às 15h/i);
  });

  it("transcrição errada aparece como Confirmação errada, e o não abre a correção", async () => {
    const transcritor = criarTranscritorDitadoNativo();
    const transcricaoErrada = "reunião com a Ana amanhã às 15h";
    const mensagem = await mensagemAPartirDoCampo(
      transcritor,
      transcricaoErrada,
    );
    const calendario = criarCalendarioEmMemoria([]);

    const proposta = await processarTurno(
      { mensagem, agora: AGORA },
      calendario,
    );

    expect(proposta.texto).toContain("15h");
    expect(proposta.texto).not.toContain("16h às");

    const recusa = await processarTurno(
      {
        mensagem: "não",
        agora: AGORA,
        confirmacaoPendente: proposta.confirmacaoPendente,
      },
      calendario,
    );

    expect(recusa.texto).toMatch(/o que mudar/i);
    expect(recusa.confirmacaoPendente).toMatchObject({
      acao: "marcar_pontual",
      titulo: "Reunião com a Ana",
    });
    expect(calendario.listarTodos()).toHaveLength(0);
  });
});
