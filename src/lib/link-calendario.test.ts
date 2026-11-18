import {
  htmlLinkSeguro,
  urlAbrirCalendario,
  urlVisaoDoDiaNoCalendario,
} from "@/lib/link-calendario";
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

describe("htmlLink do evento no Google Agenda", () => {
  const eid =
    "https://www.google.com/calendar/event?eid=YWJjMTIz";
  const calendarHost =
    "https://calendar.google.com/calendar/event?eid=YWJjMTIz";

  it("aceita o htmlLink https do Google e recusa calshow, webcal e ics", () => {
    expect(htmlLinkSeguro(eid)).toBe(eid);
    expect(htmlLinkSeguro(calendarHost)).toBe(calendarHost);
    expect(htmlLinkSeguro("calshow:123")).toBeNull();
    expect(htmlLinkSeguro("webcal://calendar.google.com/x")).toBeNull();
    expect(
      htmlLinkSeguro("https://calendar.google.com/calendar/ical/x.ics"),
    ).toBeNull();
    expect(htmlLinkSeguro("https://evil.example/calendar")).toBeNull();
  });

  it("no iPhone também usa o htmlLink, nunca o Calendário da Apple", () => {
    expect(urlAbrirCalendario("2025-10-15", eid)).toBe(eid);
    expect(urlAbrirCalendario("2025-10-15", "calshow:1")).toBe(
      urlVisaoDoDiaNoCalendario("2025-10-15"),
    );
    expect(urlAbrirCalendario("2025-10-15")).toBe(
      urlVisaoDoDiaNoCalendario("2025-10-15"),
    );
    expect(urlAbrirCalendario("2025-10-15", eid)).not.toMatch(
      /calshow:|webcal:|\.ics/i,
    );
  });
});
