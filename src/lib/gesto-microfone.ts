/** Distância mínima (px) para arrastar para cima e travar, como no WhatsApp. */
export const LIMIAR_TRAVA_PX = 56;

/** Distância mínima (px) para arrastar para o lado e cancelar. */
export const LIMIAR_CANCELA_PX = 64;

export type DestinoGestoMicrofone = "segurar" | "trava" | "cancela";

export type AcaoAoSoltarMicrofone = "enviar" | "manter" | "cancelar";

/**
 * Interpreta o arraste a partir do ponto em que o Dono segurou o microfone.
 * O eixo dominante ganha: para cima trava, para o lado (esquerda ou direita) cancela.
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
  if (absX >= limiarCancela && absX > absY) {
    return "cancela";
  }
  return "segurar";
}

export function acaoAoSoltarMicrofone(
  destino: DestinoGestoMicrofone,
): AcaoAoSoltarMicrofone {
  if (destino === "cancela") return "cancelar";
  if (destino === "trava") return "manter";
  return "enviar";
}
