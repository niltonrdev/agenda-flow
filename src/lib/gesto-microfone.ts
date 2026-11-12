/** Distância mínima (px) para arrastar para cima e travar, como no WhatsApp. */
export const LIMIAR_TRAVA_PX = 56;

/** Distância mínima (px) para arrastar para a esquerda e cancelar. */
export const LIMIAR_CANCELA_PX = 64;

/**
 * Toque curto: soltar antes deste limiar, sem arraste, deixa a gravação
 * em mãos livres (Enviar e Cancelar visíveis). Segurar além disso e soltar
 * finaliza: o texto fica na caixa e o reconhecimento para.
 */
export const LIMIAR_TOQUE_MS = 280;

export type DestinoGestoMicrofone = "segurar" | "trava" | "cancela";

export type AcaoAoSoltarMicrofone = "parar" | "manter" | "cancelar";

export type FaseMicrofone = "idle" | "segurando" | "travado";

/**
 * Interpreta o arraste a partir do ponto em que o Dono tocou o microfone.
 * O eixo dominante ganha: para cima trava, para a esquerda cancela.
 */
export function destinoDoGestoMicrofone(
  origem: { x: number; y: number },
  atual: { x: number; y: number },
  limiarTrava = LIMIAR_TRAVA_PX,
  limiarCancela = LIMIAR_CANCELA_PX,
): DestinoGestoMicrofone {
  const dx = atual.x - origem.x;
  const dy = atual.y - origem.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (dy < -limiarTrava && absY >= absX) {
    return "trava";
  }
  if (dx < -limiarCancela && absX > absY) {
    return "cancela";
  }
  return "segurar";
}

/**
 * Soltar o dedo:
 * - arraste para a esquerda → cancela (descarta o texto ouvido)
 * - arraste para cima → trava (continua após soltar, com Enviar/Cancelar)
 * - toque curto sem arraste → o mesmo que travar (não para sozinho)
 * - segurar além do limiar sem arraste → finaliza (texto na caixa, para de ouvir)
 */
export function acaoAoSoltarMicrofone(
  destino: DestinoGestoMicrofone,
  duracaoMs: number,
  limiarToqueMs = LIMIAR_TOQUE_MS,
): AcaoAoSoltarMicrofone {
  if (destino === "cancela") return "cancelar";
  if (destino === "trava") return "manter";
  if (duracaoMs < limiarToqueMs) return "manter";
  return "parar";
}

/** Gravação em mãos livres (toque ou trava) mostra Cancelar e Enviar. */
export function mostraAcoesGravacaoTravada(fase: FaseMicrofone): boolean {
  return fase === "travado";
}
