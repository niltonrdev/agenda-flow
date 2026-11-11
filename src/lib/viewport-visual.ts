/** Altura CSS do visualViewport, para o composer não ficar atrás do teclado no iPhone. */
export function cssAlturaViewportVisual(
  viewport: { height: number } | null | undefined,
  fallbackPx: number,
): string {
  const altura =
    viewport != null && Number.isFinite(viewport.height)
      ? viewport.height
      : fallbackPx;
  return `${Math.max(0, Math.round(altura))}px`;
}
