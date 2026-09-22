import type { Compromisso } from "./compromisso";
import { formatarDiaPorExtenso, formatarHora } from "./fuso";

export const RESPOSTA_NAO_ENTENDI =
  "Não entendi o pedido. Pode reformular?";

function formatarCompromisso(compromisso: Compromisso): string {
  if (compromisso.tipo === "pontual") {
    return `${compromisso.titulo}, ${formatarHora(compromisso.inicio)}–${formatarHora(compromisso.fim)}`;
  }
  if (compromisso.primeiroDia === compromisso.ultimoDia) {
    return `${compromisso.titulo} (dia inteiro)`;
  }
  return `${compromisso.titulo}, de ${formatarDiaPorExtenso(compromisso.primeiroDia)} a ${formatarDiaPorExtenso(compromisso.ultimoDia)}`;
}

export function formatarConsultaDia(
  dia: string,
  compromissos: Compromisso[],
): string {
  const rotulo = formatarDiaPorExtenso(dia);
  if (compromissos.length === 0) {
    return `${rotulo} está livre.`;
  }

  const linhas = compromissos.map((c) => `• ${formatarCompromisso(c)}`);
  return `Em ${rotulo}:\n${linhas.join("\n")}`;
}
