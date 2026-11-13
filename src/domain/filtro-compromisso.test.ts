import {
  BUSCA_INCLUI_PADRAO,
  casaComFiltroTipo,
  casaComTermoLivre,
  compromissoPublico,
  contemPalavraInteira,
  janelaDaListagem,
} from "@/domain/filtro-compromisso";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

describe("casamento de tipo e termo", () => {
  it("casa palavra inteira e ignora acento (CA4, CA5, CA15b)", () => {
    expect(contemPalavraInteira("Reunião time", "reuniao")).toBe(true);
    expect(contemPalavraInteira("Recall de clientes", "call")).toBe(false);
    expect(contemPalavraInteira("Voo GRU-REC", "voo")).toBe(true);
    expect(
      casaComFiltroTipo(
        { titulo: "Compromisso", descricao: "voo para Recife" },
        "viagens",
      ),
    ).toBe(true);
  });

  it("termo livre é literal e ignora acento (CA11, CA16)", () => {
    expect(
      casaComTermoLivre({ titulo: "Almoço com João Silva" }, "joao"),
    ).toBe(true);
    expect(casaComTermoLivre({ titulo: "abc" }, ".*")).toBe(false);
    expect(casaComTermoLivre({ titulo: "foo.*bar" }, ".*")).toBe(true);
    expect(casaComTermoLivre({ titulo: "not html" }, "<b>")).toBe(false);
  });

  it("D1 titulo+descricao casa descrição; titulo sozinho não", () => {
    const evento = { titulo: "Consulta", descricao: "dentista" };
    expect(casaComTermoLivre(evento, "dentista")).toBe(true);
    expect(casaComTermoLivre(evento, "dentista", "titulo")).toBe(false);
    expect(BUSCA_INCLUI_PADRAO).toBe("titulo+descricao");
  });

  it("compromissoPublico remove a descrição (CA15c, CA15d)", () => {
    const publico = compromissoPublico({
      id: "1",
      titulo: "Consulta",
      tipo: "pontual",
      inicio: "2026-11-14T10:00:00.000-03:00",
      fim: "2026-11-14T11:00:00.000-03:00",
      descricao: "dentista secreto",
    });
    expect(publico).toEqual({
      id: "1",
      titulo: "Consulta",
      tipo: "pontual",
      inicio: "2026-11-14T10:00:00.000-03:00",
      fim: "2026-11-14T11:00:00.000-03:00",
    });
    expect(JSON.stringify(publico)).not.toMatch(/dentista|descricao/i);
  });

  it("sem data a janela começa agora e dura 365 dias", () => {
    const agora = DateTime.fromObject(
      { year: 2026, month: 11, day: 13, hour: 10 },
      { zone: FUSO_DONO },
    );
    const janela = janelaDaListagem(agora, { futuro: true });
    expect(janela.inicio).toContain("2026-11-13T10:00");
    expect(DateTime.fromISO(janela.fim, { setZone: true }).diff(
      DateTime.fromISO(janela.inicio, { setZone: true }),
      "days",
    ).days).toBe(365);
  });
});
