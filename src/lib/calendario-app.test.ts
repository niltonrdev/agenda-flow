import { obterCalendario } from "@/lib/calendario-app";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

const AGORA = DateTime.fromObject(
  { year: 2025, month: 8, day: 1, hour: 10 },
  { zone: "America/Sao_Paulo" },
);

describe("escolha do adaptador Calendário", () => {
  it("sobe com o adaptador em memória sem credencial", async () => {
    const calendario = obterCalendario({
      agora: AGORA,
      env: {},
    });
    const listados = await calendario.listar({
      inicio: "2025-09-07T00:00:00.000-03:00",
      fim: "2025-09-07T23:59:59.999-03:00",
    });
    expect(listados.some((c) => c.titulo === "Cirurgia")).toBe(true);
  });

  it("sobe com o adaptador em memória quando há credencial mas ainda não há sessão", async () => {
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
  });
});
