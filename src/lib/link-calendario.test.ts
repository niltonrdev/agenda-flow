import { urlVisaoDoDiaNoCalendario } from "@/lib/link-calendario";
import { describe, expect, it } from "vitest";

describe("url da visão do dia no Calendário", () => {
  it("abre o Google Calendar no dia civil, sem zero à esquerda no mês e no dia", () => {
    expect(urlVisaoDoDiaNoCalendario("2025-10-15")).toBe(
      "https://calendar.google.com/calendar/r/day/2025/10/15",
    );
    expect(urlVisaoDoDiaNoCalendario("2026-01-05")).toBe(
      "https://calendar.google.com/calendar/r/day/2026/1/5",
    );
  });
});
