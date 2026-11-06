import type {
  AgendaGoogle,
  ClienteCalendarioGoogle,
  EventoGoogle,
  EventoParaGravar,
} from "@/adapters/calendario-google";
import type { IntervaloCalendario } from "@/domain/calendario";
import { falhaDeHttpGoogle, falhaDoCalendario } from "@/domain/falha-calendario";
import { LIMITE_EVENTOS_POR_AGENDA, TIMEOUT_GOOGLE_MS } from "@/lib/limites";

const API = "https://www.googleapis.com/calendar/v3";

async function lerJson(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();
  if (!texto) return {};
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw falhaDoCalendario("temporaria");
  }
}

async function chamar<T>(
  fetchFn: typeof fetch,
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  let resposta: Response;
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_GOOGLE_MS);
  try {
    resposta = await fetchFn(url, {
      ...init,
      signal: init?.signal ?? controlador.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw falhaDoCalendario("temporaria");
  } finally {
    clearTimeout(timer);
  }

  if (!resposta.ok) {
    throw falhaDeHttpGoogle(resposta.status);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  return (await lerJson(resposta)) as T;
}

export function criarClienteCalendarioGoogle(opcoes: {
  fetch?: typeof fetch;
  obterAccessToken: () => Promise<string>;
}): ClienteCalendarioGoogle {
  const fetchFn = opcoes.fetch ?? fetch;

  return {
    async listarAgendas() {
      const token = await opcoes.obterAccessToken();
      const corpo = await chamar<{ items?: AgendaGoogle[] }>(
        fetchFn,
        token,
        `${API}/users/me/calendarList?minAccessRole=reader`,
      );
      return corpo.items ?? [];
    },

    async listarEventos(calendarId, intervalo: IntervaloCalendario) {
      const token = await opcoes.obterAccessToken();
      const params = new URLSearchParams({
        timeMin: intervalo.inicio,
        timeMax: intervalo.fim,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: String(LIMITE_EVENTOS_POR_AGENDA),
      });
      const corpo = await chamar<{ items?: EventoGoogle[] }>(
        fetchFn,
        token,
        `${API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      );
      return corpo.items ?? [];
    },

    async obterEvento(calendarId, eventId) {
      const token = await opcoes.obterAccessToken();
      return chamar<EventoGoogle>(
        fetchFn,
        token,
        `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
    },

    async criarEvento(calendarId, evento: EventoParaGravar) {
      const token = await opcoes.obterAccessToken();
      return chamar<EventoGoogle>(
        fetchFn,
        token,
        `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", body: JSON.stringify(evento) },
      );
    },

    async alterarEvento(calendarId, eventId, evento: EventoParaGravar) {
      const token = await opcoes.obterAccessToken();
      return chamar<EventoGoogle>(
        fetchFn,
        token,
        `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", body: JSON.stringify(evento) },
      );
    },

    async cancelarEvento(calendarId, eventId) {
      const token = await opcoes.obterAccessToken();
      await chamar<void>(
        fetchFn,
        token,
        `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "DELETE" },
      );
    },
  };
}
