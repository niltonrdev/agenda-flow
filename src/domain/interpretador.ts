import { MESES_PT, resolverAnoDaData } from "./fuso";
import { DateTime } from "luxon";

export type IntencaoConsultaDia = {
  tipo: "consulta_dia";
  dia: string;
};

export type IntencaoDesconhecida = {
  tipo: "desconhecida";
};

export type Intencao = IntencaoConsultaDia | IntencaoDesconhecida;

function normalizarMes(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Interpretador por regras (PT-BR). Ticket 01: Consulta de um dia.
 * Datas e horas relativas a "agora" em America/Sao_Paulo.
 */
export function interpretarMensagem(
  mensagem: string,
  agora: DateTime,
): Intencao {
  const texto = mensagem.trim().toLowerCase().normalize("NFC");

  const matchData =
    /(?:^|\b)(?:dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.exec(
      texto,
    );

  if (matchData) {
    const dia = Number(matchData[1]);
    const mes = MESES_PT[normalizarMes(matchData[2])];

    if (!mes || dia < 1 || dia > 31) {
      return { tipo: "desconhecida" };
    }

    try {
      return {
        tipo: "consulta_dia",
        dia: resolverAnoDaData(dia, mes, agora),
      };
    } catch {
      return { tipo: "desconhecida" };
    }
  }

  return { tipo: "desconhecida" };
}
