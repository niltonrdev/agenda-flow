import type { Compromisso } from "./compromisso";
import { FUSO_DONO, fimDoDia, inicioDoDia } from "./fuso";
import { TETO_BUSCA_DIAS } from "@/lib/limites";
import { DateTime } from "luxon";

/** D1: padrão título+descrição; `titulo` existe para recuar sem mudar a regra. */
export type BuscaInclui = "titulo" | "titulo+descricao";
export const BUSCA_INCLUI_PADRAO: BuscaInclui = "titulo+descricao";

export const PALAVRAS_VIAGEM = [
  "viagem",
  "voo",
  "aeroporto",
  "hotel",
  "hospedagem",
  "embarque",
] as const;

export const PALAVRAS_REUNIAO = [
  "reuniao",
  "meeting",
  "call",
  "1:1",
  "alinhamento",
  "daily",
] as const;

export type FiltroTipo = "viagens" | "reunioes";

export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function escaparRegexLiteral(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textoDosCampos(
  compromisso: Pick<Compromisso, "titulo"> & { descricao?: string },
  buscaInclui: BuscaInclui,
): string {
  if (buscaInclui === "titulo+descricao" && compromisso.descricao) {
    return `${compromisso.titulo}\n${compromisso.descricao}`;
  }
  return compromisso.titulo;
}

/** Palavra inteira, ignorando maiúsculas e acentos. O termo nunca vira RegExp do Dono. */
export function contemPalavraInteira(texto: string, palavra: string): boolean {
  const haystack = normalizarParaBusca(texto);
  const needle = normalizarParaBusca(palavra);
  if (!needle) return false;
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaparRegexLiteral(needle)}(?![\\p{L}\\p{N}])`,
    "u",
  );
  return re.test(haystack);
}

export function casaComFiltroTipo(
  compromisso: Pick<Compromisso, "titulo"> & { descricao?: string },
  filtro: FiltroTipo,
  buscaInclui: BuscaInclui = BUSCA_INCLUI_PADRAO,
): boolean {
  const palavras = filtro === "viagens" ? PALAVRAS_VIAGEM : PALAVRAS_REUNIAO;
  const texto = textoDosCampos(compromisso, buscaInclui);
  return palavras.some((palavra) => contemPalavraInteira(texto, palavra));
}

/**
 * O termo é literal: substring, sem RegExp. Maiúsculas e acentos ignorados.
 * Frase com várias palavras casa a frase inteira.
 */
export function casaComTermoLivre(
  compromisso: Pick<Compromisso, "titulo"> & { descricao?: string },
  termo: string,
  buscaInclui: BuscaInclui = BUSCA_INCLUI_PADRAO,
): boolean {
  const needle = normalizarParaBusca(termo).trim();
  if (!needle) return false;
  return normalizarParaBusca(textoDosCampos(compromisso, buscaInclui)).includes(
    needle,
  );
}

/** Tira a descrição antes de qualquer saída, cookie ou log. */
export function compromissoPublico(compromisso: Compromisso): Compromisso {
  if (compromisso.tipo === "pontual") {
    return {
      id: compromisso.id,
      titulo: compromisso.titulo,
      tipo: "pontual",
      inicio: compromisso.inicio,
      fim: compromisso.fim,
    };
  }
  return {
    id: compromisso.id,
    titulo: compromisso.titulo,
    tipo: "periodo",
    primeiroDia: compromisso.primeiroDia,
    ultimoDia: compromisso.ultimoDia,
  };
}

export function janelaDaListagem(
  agora: DateTime,
  opcoes: {
    futuro: boolean;
    primeiroDia?: string;
    ultimoDia?: string;
  },
): { inicio: string; fim: string } {
  const base = agora.setZone(FUSO_DONO);
  const teto = base.plus({ days: TETO_BUSCA_DIAS });
  if (opcoes.futuro || !opcoes.primeiroDia || !opcoes.ultimoDia) {
    return { inicio: base.toISO()!, fim: teto.toISO()! };
  }
  const inicio = inicioDoDia(opcoes.primeiroDia);
  const inicioIso = inicio.toISO()!;
  const tetoIso = teto.toISO()!;
  let fimIso = fimDoDia(opcoes.ultimoDia).toISO()!;
  const maxFimIso = inicio.plus({ days: TETO_BUSCA_DIAS }).endOf("day").toISO()!;
  if (fimIso > maxFimIso) fimIso = maxFimIso;
  if (fimIso > tetoIso) fimIso = tetoIso;
  if (inicioIso > tetoIso) {
    return { inicio: tetoIso, fim: tetoIso };
  }
  if (fimIso < inicioIso) {
    return { inicio: inicioIso, fim: inicioIso };
  }
  return { inicio: inicioIso, fim: fimIso };
}
