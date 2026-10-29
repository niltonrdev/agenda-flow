import { FUSO_DONO } from "@/domain/fuso";
import {
  ehAparelhoIos,
  urlAbrirCalendario,
  urlCalendarioNativoIos,
  urlVisaoDaSemanaNoCalendario,
} from "@/lib/link-calendario";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

describe("url da visão da semana no Calendário", () => {
  it("abre o Google Calendar na semana do dia civil, sem zero à esquerda no mês e no dia", () => {
    expect(urlVisaoDaSemanaNoCalendario("2025-10-15")).toBe(
      "https://calendar.google.com/calendar/r/week/2025/10/15",
    );
    expect(urlVisaoDaSemanaNoCalendario("2026-01-05")).toBe(
      "https://calendar.google.com/calendar/r/week/2026/1/5",
    );
  });
});

describe("url do Calendário nativo no iPhone", () => {
  it("abre o app Calendário no início daquele dia em Brasília", () => {
    const esperado = Math.floor(
      DateTime.fromISO("2025-10-15", { zone: FUSO_DONO }).startOf("day").toSeconds(),
    );
    expect(urlCalendarioNativoIos("2025-10-15")).toBe(`calshow:${esperado}`);
  });

  it("no iPhone usa calshow; no restante usa a visão da semana no Google", () => {
    expect(ehAparelhoIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(
      true,
    );
    expect(urlAbrirCalendario("2025-10-15", "iPhone")).toBe(
      urlCalendarioNativoIos("2025-10-15"),
    );
    expect(urlAbrirCalendario("2025-10-15", "Mozilla/5.0 (Windows NT 10.0)")).toBe(
      urlVisaoDaSemanaNoCalendario("2025-10-15"),
    );
  });
});
