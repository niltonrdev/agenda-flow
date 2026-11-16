import { distanciaEdicao, FUSO_DONO, mesPorNome, recorteMes } from "@/domain/fuso";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

describe("mesPorNome", () => {
  it("reconhece o nome certo, com e sem acento", () => {
    expect(mesPorNome("dezembro")).toBe(12);
    expect(mesPorNome("março")).toBe(3);
    expect(mesPorNome("Marco")).toBe(3);
  });

  it("tolera erro de digitação como dezemobro", () => {
    expect(mesPorNome("dezemobro")).toBe(12);
    expect(mesPorNome("novembo")).toBe(11);
    expect(mesPorNome("setembroo")).toBe(9);
  });

  it("não inventa mês para termo qualquer", () => {
    expect(mesPorNome("dentista")).toBeUndefined();
    expect(mesPorNome("")).toBeUndefined();
    expect(mesPorNome("joao")).toBeUndefined();
  });

  it("distância de edição conta inserção em dezemobro", () => {
    expect(distanciaEdicao("dezemobro", "dezembro")).toBe(1);
  });
});

describe("recorteMes", () => {
  const agora = DateTime.fromObject(
    { year: 2026, month: 11, day: 13, hour: 10 },
    { zone: FUSO_DONO },
  );

  it("dezembro em novembro aponta o dezembro que vem neste ano", () => {
    expect(recorteMes(12, agora)).toEqual({
      primeiroDia: "2026-12-01",
      ultimoDia: "2026-12-31",
    });
  });

  it("janeiro em novembro aponta o janeiro do ano seguinte", () => {
    expect(recorteMes(1, agora)).toEqual({
      primeiroDia: "2027-01-01",
      ultimoDia: "2027-01-31",
    });
  });

  it("com ano explícito usa aquele ano, mesmo passado", () => {
    expect(recorteMes(1, agora, 2026)).toEqual({
      primeiroDia: "2026-01-01",
      ultimoDia: "2026-01-31",
    });
  });
});
