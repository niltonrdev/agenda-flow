import {
  falhaDeHttpGoogle,
  falhaDoCalendario,
  FalhaDoCalendario,
  RESPOSTA_NAO_GRAVADO,
} from "@/domain/falha-calendario";
import { describe, expect, it } from "vitest";

describe("falha do Calendário", () => {
  it("mantém a mensagem genérica no caso temporário", () => {
    expect(new FalhaDoCalendario().message).toBe(RESPOSTA_NAO_GRAVADO);
    expect(new FalhaDoCalendario().codigo).toBe("temporaria");
  });

  it("classifica HTTP do Google sem vazar o corpo", () => {
    expect(falhaDeHttpGoogle(401).codigo).toBe("reconectar");
    expect(falhaDeHttpGoogle(403).codigo).toBe("permissao");
    expect(falhaDeHttpGoogle(503).codigo).toBe("temporaria");
    expect(falhaDeHttpGoogle(401).message).not.toMatch(/token|@|Bearer/i);
    expect(falhaDoCalendario("configuracao").codigo).toBe("configuracao");
  });
});
