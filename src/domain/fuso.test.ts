import {
  distanciaEdicao,
  formatarDiaPorExtenso,
  FUSO_DONO,
  mesPorNome,
  recorteMes,
  resolverDiaMesConsulta,
} from "@/domain/fuso";
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

describe("resolverDiaMesConsulta", () => {
  const agora = DateTime.fromObject(
    { year: 2026, month: 11, day: 17, hour: 10 },
    { zone: FUSO_DONO },
  );

  it("dia+mês já passado neste ano vai para o ano seguinte", () => {
    expect(resolverDiaMesConsulta(5, 1, agora)).toBe("2027-01-05");
  });

  it("hoje neste ano permanece neste ano", () => {
    expect(resolverDiaMesConsulta(17, 11, agora)).toBe("2026-11-17");
  });

  it("virada de 31 de dezembro para 1º de janeiro", () => {
    const fimDoAno = DateTime.fromObject(
      { year: 2026, month: 12, day: 31, hour: 22 },
      { zone: FUSO_DONO },
    );
    expect(resolverDiaMesConsulta(31, 12, fimDoAno)).toBe("2026-12-31");
    expect(resolverDiaMesConsulta(1, 1, fimDoAno)).toBe("2027-01-01");
  });

  it("ano explícito é respeitado mesmo já passado", () => {
    expect(resolverDiaMesConsulta(5, 1, agora, 2026)).toBe("2026-01-05");
  });
});

describe("formatarDiaPorExtenso", () => {
  const agora = DateTime.fromObject(
    { year: 2026, month: 11, day: 17, hour: 10 },
    { zone: FUSO_DONO },
  );

  it("mostra o ano quando o dia resolvido não é deste ano", () => {
    expect(
      formatarDiaPorExtenso("2027-01-05", { agoraReferencia: agora }),
    ).toBe("5 de janeiro de 2027");
  });

  it("omite o ano quando o dia é deste ano", () => {
    expect(
      formatarDiaPorExtenso("2026-12-05", { agoraReferencia: agora }),
    ).toBe("5 de dezembro");
  });
});
