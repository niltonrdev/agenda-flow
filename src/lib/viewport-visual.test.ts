import {
  cssAlturaViewportVisual,
  cssDeslocamentoViewportVisual,
  deveZerarRolagemLayout,
  propriedadesViewportVisual,
} from "@/lib/viewport-visual";
import { describe, expect, it } from "vitest";

describe("altura do viewport visual", () => {
  it("usa a altura do visualViewport quando existe", () => {
    expect(cssAlturaViewportVisual({ height: 390.4 }, 800)).toBe("390px");
  });

  it("cai no fallback se o visualViewport não estiver disponível", () => {
    expect(cssAlturaViewportVisual(null, 800)).toBe("800px");
  });

  it("usa offsetTop do visualViewport para acompanhar o teclado do iOS", () => {
    expect(cssDeslocamentoViewportVisual({ offsetTop: 312.6 })).toBe("313px");
    expect(cssDeslocamentoViewportVisual(null)).toBe("0px");
    expect(cssDeslocamentoViewportVisual({})).toBe("0px");
  });

  it("devolve altura e deslocamento juntos", () => {
    expect(
      propriedadesViewportVisual({ height: 390, offsetTop: 250 }, 800),
    ).toEqual({ altura: "390px", deslocamento: "250px" });
  });

  it("pede para zerar a rolagem do layout se o Safari deslocou a página", () => {
    expect(deveZerarRolagemLayout(0, 0)).toBe(false);
    expect(deveZerarRolagemLayout(0, 180)).toBe(true);
    expect(deveZerarRolagemLayout(12, 0)).toBe(true);
  });
});
