import { RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA } from "@/adapters/calendario-em-memoria";
import { obterCalendario } from "@/lib/calendario-app";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const AGORA = DateTime.fromObject(
  { year: 2025, month: 8, day: 1, hour: 10 },
  { zone: "America/Sao_Paulo" },
);

describe("escolha do adaptador Calendário", () => {
  it("sobe com demonstração somente leitura sem credencial", async () => {
    const calendario = obterCalendario({
      agora: AGORA,
      env: {},
    });
    const listados = await calendario.listar({
      inicio: "2025-09-07T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });
    expect(listados.some((c) => c.titulo === "Cirurgia")).toBe(true);
    await expect(
      calendario.criar({
        tipo: "periodo",
        titulo: "Segredo",
        primeiroDia: "2025-09-08",
        ultimoDia: "2025-09-08",
      }),
    ).rejects.toMatchObject({ message: RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA });
  });

  it("não compartilha estado mutável entre requisições sem sessão", async () => {
    const a = obterCalendario({ agora: AGORA, env: {} });
    const b = obterCalendario({ agora: AGORA, env: {} });
    await expect(a.cancelar("demo-cirurgia")).rejects.toBeDefined();
    const listados = await b.listar({
      inicio: "2025-09-07T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });
    expect(listados.some((c) => c.id === "demo-cirurgia")).toBe(true);
  });

  it("com credencial mas sem sessão também fica só na demonstração de leitura", async () => {
    const calendario = obterCalendario({
      agora: AGORA,
      env: {
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      },
    });
    const listados = await calendario.listar({
      inicio: "2025-09-07T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });
    expect(listados.some((c) => c.titulo === "Cirurgia")).toBe(true);
    await expect(calendario.cancelar("demo-cirurgia")).rejects.toMatchObject({
      message: RESPOSTA_DEMONSTRACAO_SOMENTE_LEITURA,
    });
  });
});
