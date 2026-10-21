import type { Compromisso, NovoCompromisso } from "./compromisso";
import { FUSO_DONO, fimDoDia, inicioDoDia } from "./fuso";
import { DateTime } from "luxon";

function intervaloDe(compromisso: NovoCompromisso): {
  inicio: DateTime;
  fim: DateTime;
} {
  if (compromisso.tipo === "pontual") {
    return {
      inicio: DateTime.fromISO(compromisso.inicio, { setZone: true }),
      fim: DateTime.fromISO(compromisso.fim, { setZone: true }),
    };
  }
  return {
    inicio: inicioDoDia(compromisso.primeiroDia),
    fim: fimDoDia(compromisso.ultimoDia),
  };
}

function sobrepoe(
  a: { inicio: DateTime; fim: DateTime },
  b: { inicio: DateTime; fim: DateTime },
): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export function compromissosEmConflito(
  proposto: NovoCompromisso,
  existentes: Compromisso[],
  ignorarId?: string,
): Compromisso[] {
  const alvo = intervaloDe(proposto);
  return existentes.filter((atual) => {
    if (ignorarId && atual.id === ignorarId) return false;
    return sobrepoe(alvo, intervaloDe(atual));
  });
}

export function intervaloDeListagem(proposto: NovoCompromisso): {
  inicio: string;
  fim: string;
} {
  const { inicio, fim } = intervaloDe(proposto);
  return { inicio: inicio.toISO()!, fim: fim.toISO()! };
}

export function janelaDeBusca(agora: DateTime): { inicio: string; fim: string } {
  const base = agora.setZone(FUSO_DONO);
  return {
    inicio: base.minus({ years: 1 }).startOf("year").toISO()!,
    fim: base.plus({ years: 2 }).endOf("year").toISO()!,
  };
}
