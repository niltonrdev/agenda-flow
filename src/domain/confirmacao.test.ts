import { describe, expect, it } from "vitest";
import { pedeSimOuNao, type ConfirmacaoPendente } from "./confirmacao";

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
        acao: "escolher_cancelamento",
        candidatos: [{ id: "1", rotulo: "Dentista" }],
      }),
    ).toBe(false);
    expect(pedeSimOuNao(null)).toBe(false);
  });
});
