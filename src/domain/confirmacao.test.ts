import { describe, expect, it } from "vitest";
import {
  candidatosDoContexto,
  ehConfirmacaoQueBloqueiaListagem,
  pedeSimOuNao,
  type ConfirmacaoPendente,
} from "./confirmacao";

const pontual: ConfirmacaoPendente = {
  acao: "marcar_pontual",
  titulo: "Reunião",
  inicio: "2026-11-15T15:00:00.000-03:00",
  fim: "2026-11-15T16:00:00.000-03:00",
};

describe("pede sim ou não", () => {
  it("mostra os botões na Confirmação de marcar, alterar e cancelar", () => {
    expect(pedeSimOuNao(pontual)).toBe(true);
    expect(
      pedeSimOuNao({
        acao: "cancelar_periodo",
        id: "1",
        titulo: "Férias",
        primeiroDia: "2026-12-01",
        ultimoDia: "2026-12-10",
      }),
    ).toBe(true);
  });

  it("esconde os botões enquanto espera correção, horário ou escolha", () => {
    expect(pedeSimOuNao({ ...pontual, aguardandoCorrecao: true })).toBe(false);
    expect(
      pedeSimOuNao({ acao: "completar_marcacao", titulo: "Dentista" }),
    ).toBe(false);
    expect(
      pedeSimOuNao({
        acao: "completar_duracao_periodo",
        titulo: "Viagem BH",
        dia: "2026-11-07",
      }),
    ).toBe(false);
    expect(
      pedeSimOuNao({
        acao: "escolher_cancelamento",
        candidatos: [{ id: "1", rotulo: "Dentista" }],
      }),
    ).toBe(false);
    expect(
      pedeSimOuNao({
        acao: "contexto_listagem",
        candidatos: [{ id: "1", rotulo: "Dentista" }],
        em: "2026-11-13T12:41:00.000-03:00",
      }),
    ).toBe(false);
    expect(pedeSimOuNao(null)).toBe(false);
    expect(
      pedeSimOuNao({
        acao: "listagem_paginada",
        filtro: "viagens",
        futuro: true,
        offset: 15,
      }),
    ).toBe(false);
  });
});

describe("listagem vs Confirmação", () => {
  const contexto: ConfirmacaoPendente = {
    acao: "contexto_listagem",
    candidatos: [{ id: "1", rotulo: "Voo GRU-REC" }],
    em: "2026-11-13T12:41:00.000-03:00",
  };
  const paginada: ConfirmacaoPendente = {
    acao: "listagem_paginada",
    filtro: "viagens",
    futuro: true,
    offset: 15,
    candidatos: [{ id: "1", rotulo: "Voo GRU-REC" }],
    em: "2026-11-13T12:41:00.000-03:00",
  };

  it("Confirmação, completar e desambiguar bloqueiam a listagem", () => {
    expect(ehConfirmacaoQueBloqueiaListagem(pontual)).toBe(true);
    expect(
      ehConfirmacaoQueBloqueiaListagem({
        acao: "escolher_cancelamento",
        candidatos: [{ id: "1", rotulo: "Voo GRU-REC" }],
      }),
    ).toBe(true);
    expect(
      ehConfirmacaoQueBloqueiaListagem({
        acao: "completar_marcacao",
        titulo: "Dentista",
      }),
    ).toBe(true);
  });

  it("contexto de consulta e paginação não bloqueiam um pedido novo de listagem", () => {
    expect(ehConfirmacaoQueBloqueiaListagem(contexto)).toBe(false);
    expect(ehConfirmacaoQueBloqueiaListagem(paginada)).toBe(false);
  });

  it("Cancelar curto lê os candidatos da página visível", () => {
    expect(candidatosDoContexto(contexto)?.map((c) => c.id)).toEqual(["1"]);
    expect(candidatosDoContexto(paginada)?.map((c) => c.id)).toEqual(["1"]);
    expect(candidatosDoContexto(pontual)).toBeNull();
  });
});
