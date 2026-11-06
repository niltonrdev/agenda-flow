import { FUSO_DONO } from "@/domain/fuso";
import { DateTime } from "luxon";

export type SelecaoDias = {
  inicio: string;
  fim?: string;
};

export type CelulaMes = {
  iso: string;
  diaDoMes: number;
  foraDoMes: boolean;
};

/** Grade de 6 semanas, domingo → sábado, no fuso do Dono. */
export function celulasDoMes(ano: number, mes: number): CelulaMes[] {
  const primeiro = DateTime.fromObject(
    { year: ano, month: mes, day: 1 },
    { zone: FUSO_DONO },
  );
  const inicioGrade = primeiro.minus({ days: primeiro.weekday % 7 });
  const celulas: CelulaMes[] = [];
  for (let i = 0; i < 42; i++) {
    const dia = inicioGrade.plus({ days: i });
    celulas.push({
      iso: dia.toISODate()!,
      diaDoMes: dia.day,
      foraDoMes: dia.month !== mes,
    });
  }
  return celulas;
}

/** Primeiro toque escolhe o início; o segundo fecha o intervalo (ordem livre). */
export function aplicarToqueNoDia(
  selecao: SelecaoDias | null,
  iso: string,
): SelecaoDias {
  if (!selecao || selecao.fim) {
    return { inicio: iso };
  }
  if (iso < selecao.inicio) {
    return { inicio: iso, fim: selecao.inicio };
  }
  return { inicio: selecao.inicio, fim: iso };
}

export function extremosDaSelecao(selecao: SelecaoDias): {
  primeiroDia: string;
  ultimoDia: string;
} {
  return {
    primeiroDia: selecao.inicio,
    ultimoDia: selecao.fim ?? selecao.inicio,
  };
}

export function diaEstaNoIntervalo(
  iso: string,
  primeiroDia: string,
  ultimoDia: string,
): boolean {
  return iso >= primeiroDia && iso <= ultimoDia;
}

/** Mensagem que o interpretador já lê como intervalo numérico. */
export function mensagemDoIntervalo(
  primeiroDia: string,
  ultimoDia: string,
): string {
  const a = DateTime.fromISO(primeiroDia, { zone: FUSO_DONO });
  const b = DateTime.fromISO(ultimoDia, { zone: FUSO_DONO });
  const fmt = (d: DateTime) => `${d.day}/${d.month}/${d.year}`;
  if (primeiroDia === ultimoDia) {
    return fmt(a);
  }
  return `${fmt(a)} a ${fmt(b)}`;
}
