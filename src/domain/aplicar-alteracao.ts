import type { Compromisso, NovoCompromisso } from "./compromisso";
import type { DestinoAlteracao } from "./interpretador";
import { FUSO_DONO } from "./fuso";
import { DateTime } from "luxon";

function ancoraDe(compromisso: Compromisso): DateTime {
  if (compromisso.tipo === "pontual") {
    return DateTime.fromISO(compromisso.inicio, { setZone: true }).setZone(FUSO_DONO);
  }
  return DateTime.fromISO(compromisso.primeiroDia, { zone: FUSO_DONO });
}

function resolverDiaNaAncora(
  dia: number,
  mes: number | undefined,
  compromisso: Compromisso,
): string {
  const ancora = ancoraDe(compromisso);
  const month = mes ?? ancora.month;
  const dt = DateTime.fromObject(
    { year: ancora.year, month, day: dia },
    { zone: FUSO_DONO },
  );
  return dt.toISODate()!;
}

function deslocarPontual(
  compromisso: Extract<Compromisso, { tipo: "pontual" }>,
  dia: string,
  hora?: number,
  minuto?: number,
): NovoCompromisso {
  const inicioAtual = DateTime.fromISO(compromisso.inicio, { setZone: true }).setZone(
    FUSO_DONO,
  );
  const fimAtual = DateTime.fromISO(compromisso.fim, { setZone: true }).setZone(
    FUSO_DONO,
  );
  const duracao = fimAtual.diff(inicioAtual);
  const base = DateTime.fromISO(dia, { zone: FUSO_DONO }).set({
    hour: hora ?? inicioAtual.hour,
    minute: minuto ?? inicioAtual.minute,
    second: 0,
    millisecond: 0,
  });
  return {
    tipo: "pontual",
    titulo: compromisso.titulo,
    inicio: base.toISO()!,
    fim: base.plus(duracao).toISO()!,
  };
}

function deslocarPeriodo(
  compromisso: Extract<Compromisso, { tipo: "periodo" }>,
  primeiroDia: string,
): NovoCompromisso {
  const primeiro = DateTime.fromISO(compromisso.primeiroDia, { zone: FUSO_DONO });
  const ultimo = DateTime.fromISO(compromisso.ultimoDia, { zone: FUSO_DONO });
  const dias = Math.round(ultimo.diff(primeiro, "days").days);
  const novoPrimeiro = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
  return {
    tipo: "periodo",
    titulo: compromisso.titulo,
    primeiroDia,
    ultimoDia: novoPrimeiro.plus({ days: dias }).toISODate()!,
  };
}

export function aplicarDestino(
  compromisso: Compromisso,
  destino: DestinoAlteracao,
): NovoCompromisso | null {
  if (compromisso.tipo === "pontual") {
    if (destino.tipo === "dia") {
      return deslocarPontual(
        compromisso,
        resolverDiaNaAncora(destino.dia, destino.mes, compromisso),
      );
    }
    if (destino.tipo === "hora") {
      const dia = DateTime.fromISO(compromisso.inicio, { setZone: true })
        .setZone(FUSO_DONO)
        .toISODate()!;
      return deslocarPontual(compromisso, dia, destino.hora, destino.minuto);
    }
    if (destino.tipo === "dia_e_hora") {
      return deslocarPontual(
        compromisso,
        resolverDiaNaAncora(destino.dia, destino.mes, compromisso),
        destino.hora,
        destino.minuto,
      );
    }
    return null;
  }

  if (destino.tipo === "dia") {
    return deslocarPeriodo(
      compromisso,
      resolverDiaNaAncora(destino.dia, destino.mes, compromisso),
    );
  }
  if (destino.tipo === "periodo") {
    return {
      tipo: "periodo",
      titulo: compromisso.titulo,
      primeiroDia: destino.primeiroDia,
      ultimoDia: destino.ultimoDia,
    };
  }
  if (destino.tipo === "primeiro_dia") {
    if (destino.primeiroDia > compromisso.ultimoDia) return null;
    return {
      tipo: "periodo",
      titulo: compromisso.titulo,
      primeiroDia: destino.primeiroDia,
      ultimoDia: compromisso.ultimoDia,
    };
  }
  if (destino.tipo === "ultimo_dia") {
    if (destino.ultimoDia < compromisso.primeiroDia) return null;
    return {
      tipo: "periodo",
      titulo: compromisso.titulo,
      primeiroDia: compromisso.primeiroDia,
      ultimoDia: destino.ultimoDia,
    };
  }
  return null;
}

export function aplicarDestinoNaProposta(
  proposto: NovoCompromisso,
  destino: DestinoAlteracao,
): NovoCompromisso | null {
  const comoCompromisso = { ...proposto, id: "proposta" } as Compromisso;
  return aplicarDestino(comoCompromisso, destino);
}
