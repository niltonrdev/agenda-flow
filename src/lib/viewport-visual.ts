export type ViewportVisual = {
  height: number;
  offsetTop?: number;
} | null | undefined;

/** Altura CSS do visualViewport, para o composer acompanhar o teclado. */
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

/**
 * Deslocamento vertical do visualViewport. No Safari iOS o teclado virtual
 * não redimensiona o layout viewport de forma confiável: ele encolhe o
 * visualViewport e ainda desloca offsetTop (e/ou rola o documento) para
 * manter o campo focado visível. Sem este valor o shell encolhido fica no
 * topo do layout e o composer aparece no topo da tela.
 */
export function cssDeslocamentoViewportVisual(
  viewport: { offsetTop?: number } | null | undefined,
): string {
  const topo =
    viewport != null && Number.isFinite(viewport.offsetTop)
      ? viewport.offsetTop ?? 0
      : 0;
  return `${Math.round(topo)}px`;
}

export function propriedadesViewportVisual(
  viewport: ViewportVisual,
  fallbackAlturaPx: number,
): { altura: string; deslocamento: string } {
  return {
    altura: cssAlturaViewportVisual(viewport, fallbackAlturaPx),
    deslocamento: cssDeslocamentoViewportVisual(viewport),
  };
}

/** iOS tenta rolar o campo focado para o topo; zeramos a rolagem do layout. */
export function deveZerarRolagemLayout(scrollX: number, scrollY: number): boolean {
  return scrollX !== 0 || scrollY !== 0;
}
