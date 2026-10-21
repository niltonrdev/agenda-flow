import type { Calendario, IntervaloCalendario } from "@/domain/calendario";
import type { Compromisso, NovoCompromisso } from "@/domain/compromisso";
import { FalhaDoCalendario } from "@/domain/falha-calendario";
import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";

export type AgendaGoogle = {
  id: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
};

export type EventoGoogle = {
  id?: string;
  summary?: string;
  status?: string;
  recurringEventId?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

export type EventoParaGravar = {
  summary: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
};

export type ClienteCalendarioGoogle = {
  listarAgendas(): Promise<AgendaGoogle[]>;
  listarEventos(
    calendarId: string,
    intervalo: IntervaloCalendario,
  ): Promise<EventoGoogle[]>;
  criarEvento(calendarId: string, evento: EventoParaGravar): Promise<EventoGoogle>;
  alterarEvento(
    calendarId: string,
    eventId: string,
    evento: EventoParaGravar,
  ): Promise<EventoGoogle>;
  cancelarEvento(calendarId: string, eventId: string): Promise<void>;
};

const SEPARADOR_ID = ":";

export function idDoCompromisso(calendarId: string, eventId: string): string {
  return `${encodeURIComponent(calendarId)}${SEPARADOR_ID}${encodeURIComponent(eventId)}`;
}

export function partirIdDoCompromisso(id: string): {
  calendarId: string;
  eventId: string;
} {
  const indice = id.indexOf(SEPARADOR_ID);
  if (indice <= 0) {
    throw new FalhaDoCalendario();
  }
  return {
    calendarId: decodeURIComponent(id.slice(0, indice)),
    eventId: decodeURIComponent(id.slice(indice + 1)),
  };
}

export function ehCalendarioDeFeriado(agenda: AgendaGoogle): boolean {
  const id = agenda.id.toLowerCase();
  const titulo = (agenda.summary ?? "").toLowerCase();
  if (id.includes("holiday@group.v.calendar.google.com")) return true;
  if (titulo.includes("feriados")) return true;
  return false;
}

export function agendaVisivel(agenda: AgendaGoogle): boolean {
  if (agenda.hidden) return false;
  if (agenda.selected === false) return false;
  return true;
}

export function periodoParaEventoGoogle(
  titulo: string,
  primeiroDia: string,
  ultimoDia: string,
): EventoParaGravar {
  const fimExclusivo = DateTime.fromISO(ultimoDia, { zone: FUSO_DONO })
    .plus({ days: 1 })
    .toISODate();
  return {
    summary: titulo,
    start: { date: primeiroDia },
    end: { date: fimExclusivo! },
  };
}

export function pontualParaEventoGoogle(
  titulo: string,
  inicio: string,
  fim: string,
): EventoParaGravar {
  return {
    summary: titulo,
    start: { dateTime: inicio, timeZone: FUSO_DONO },
    end: { dateTime: fim, timeZone: FUSO_DONO },
  };
}

function novoParaEvento(compromisso: NovoCompromisso): EventoParaGravar {
  if (compromisso.tipo === "periodo") {
    return periodoParaEventoGoogle(
      compromisso.titulo,
      compromisso.primeiroDia,
      compromisso.ultimoDia,
    );
  }
  return pontualParaEventoGoogle(
    compromisso.titulo,
    compromisso.inicio,
    compromisso.fim,
  );
}

export function eventoGoogleParaCompromisso(
  calendarId: string,
  evento: EventoGoogle,
): Compromisso | null {
  if (!evento.id || evento.status === "cancelled") return null;
  const titulo = evento.summary?.trim() || "(sem título)";
  const id = idDoCompromisso(calendarId, evento.id);

  if (evento.start?.date && evento.end?.date) {
    const ultimoDia = DateTime.fromISO(evento.end.date, { zone: FUSO_DONO })
      .minus({ days: 1 })
      .toISODate();
    return {
      id,
      titulo,
      tipo: "periodo",
      primeiroDia: evento.start.date,
      ultimoDia: ultimoDia!,
    };
  }

  if (evento.start?.dateTime && evento.end?.dateTime) {
    return {
      id,
      titulo,
      tipo: "pontual",
      inicio: evento.start.dateTime,
      fim: evento.end.dateTime,
    };
  }

  return null;
}

export function criarCalendarioGoogle(
  cliente: ClienteCalendarioGoogle,
): Calendario {
  return {
    async listar(intervalo) {
      const agendas = await cliente.listarAgendas();
      const visiveis = agendas.filter(
        (a) => agendaVisivel(a) && !ehCalendarioDeFeriado(a),
      );
      const listas = await Promise.all(
        visiveis.map(async (agenda) => {
          const eventos = await cliente.listarEventos(agenda.id, intervalo);
          return eventos
            .map((evento) => eventoGoogleParaCompromisso(agenda.id, evento))
            .filter((c): c is Compromisso => c !== null);
        }),
      );
      return listas.flat();
    },

    async criar(compromisso) {
      const evento = await cliente.criarEvento("primary", novoParaEvento(compromisso));
      const criado = eventoGoogleParaCompromisso("primary", evento);
      if (!criado) throw new FalhaDoCalendario();
      return criado;
    },

    async alterar(id, mudancas) {
      const { calendarId, eventId } = partirIdDoCompromisso(id);
      const atualizado = { ...mudancas } as NovoCompromisso;
      if (!atualizado.tipo || !atualizado.titulo) {
        throw new FalhaDoCalendario();
      }
      const evento = await cliente.alterarEvento(
        calendarId,
        eventId,
        novoParaEvento(atualizado),
      );
      const compromisso = eventoGoogleParaCompromisso(calendarId, evento);
      if (!compromisso) throw new FalhaDoCalendario();
      return compromisso;
    },

    async cancelar(id) {
      const { calendarId, eventId } = partirIdDoCompromisso(id);
      await cliente.cancelarEvento(calendarId, eventId);
    },
  };
}
